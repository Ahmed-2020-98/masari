<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\MerchantRole;
use App\Enums\MerchantStatus;
use App\Enums\OtpPurpose;
use App\Enums\UserType;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\Merchant;
use App\Models\Plan;
use App\Models\User;
use App\Services\Auth\OtpService;
use App\Services\Wallet\WalletService;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    /**
     * Send a one-time verification code by SMS.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'purpose' => ['required', new Enum(OtpPurpose::class)],
        ]);

        $phone = $this->validPhone($data['phone']);
        $purpose = OtpPurpose::from($data['purpose']);
        $exists = User::query()->where('phone', $phone)->exists();

        if ($purpose === OtpPurpose::Register && $exists) {
            throw new DomainException('رقم الجوال مسجل مسبقاً، يمكنك تسجيل الدخول.', 'phone_taken');
        }

        if ($purpose === OtpPurpose::ResetPassword && ! $exists) {
            throw new DomainException('لا يوجد حساب مرتبط بهذا الرقم.', 'phone_not_found', 404);
        }

        $this->otp->send($phone, $purpose);

        return response()->json([
            'message' => 'تم إرسال رمز التحقق إلى جوالك.',
            'phone' => $phone,
            'expires_in' => config('masari.otp.ttl_minutes') * 60,
            'resend_in' => config('masari.otp.resend_seconds'),
        ]);
    }

    /**
     * Verify the code and return a token proving phone ownership.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'purpose' => ['required', new Enum(OtpPurpose::class)],
            'code' => ['required', 'digits:'.config('masari.otp.length')],
        ]);

        $phone = $this->validPhone($data['phone']);

        return response()->json([
            'verification_token' => $this->otp->verify($phone, OtpPurpose::from($data['purpose']), $data['code']),
            'phone' => $phone,
        ]);
    }

    /**
     * Create the user, merchant account and wallet, then issue an API token.
     */
    public function register(RegisterRequest $request, WalletService $wallet): JsonResponse
    {
        $data = $request->validated();
        $this->otp->consume($data['verification_token'], $data['phone'], OtpPurpose::Register);

        $user = DB::transaction(function () use ($data, $wallet): User {
            $user = User::create([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'phone_verified_at' => now(),
                'email' => $data['email'] ?? null,
                'password' => $data['password'],
                'type' => UserType::Merchant,
            ]);

            $merchant = Merchant::create([
                'name' => $data['name'],
                'store_name' => $data['store_name'],
                'store_url' => $data['store_url'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'],
                'plan_id' => Plan::query()->where('is_default', true)->value('id'),
                'status' => MerchantStatus::Active,
                'monthly_volume' => $data['monthly_volume'] ?? null,
            ]);

            $merchant->users()->attach($user->id, ['role' => MerchantRole::Owner->value]);
            $user->update(['current_merchant_id' => $merchant->id]);
            $wallet->for($merchant);

            return $user;
        });

        return $this->issueToken($user, $data['device_name'], $data['platform'] ?? 'web', 201);
    }

    /**
     * Authenticate with phone and password.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:120'],
            'platform' => ['nullable', Rule::in(['web', 'ios', 'android', 'admin'])],
        ]);

        $user = User::query()->where('phone', Phone::normalize($data['phone']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw new DomainException('رقم الجوال أو كلمة المرور غير صحيحة.', 'invalid_credentials', 401);
        }

        if (! $user->is_active) {
            throw new DomainException('تم إيقاف هذا الحساب، يرجى التواصل مع الدعم.', 'user_inactive', 403);
        }

        if (($data['platform'] ?? null) === 'admin' && ! $user->isAdmin()) {
            throw new DomainException('هذا الحساب لا يملك صلاحية الدخول إلى لوحة الإدارة.', 'not_admin', 403);
        }

        return $this->issueToken($user, $data['device_name'], $data['platform'] ?? 'web');
    }

    /**
     * Reset the password after OTP verification.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'verification_token' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $phone = $this->validPhone($data['phone']);
        $this->otp->consume($data['verification_token'], $phone, OtpPurpose::ResetPassword);

        $user = User::query()->where('phone', $phone)->firstOrFail();
        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن.']);
    }

    /**
     * Revoke the current device token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'تم تسجيل الخروج.']);
    }

    /**
     * Issue a per-device Sanctum token.
     */
    private function issueToken(User $user, string $deviceName, string $platform, int $status = 200): JsonResponse
    {
        $token = $user->createToken($deviceName.' · '.$platform, [$user->isAdmin() ? 'admin' : 'merchant']);
        $user->update(['last_login_at' => now()]);

        return response()->json([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'type' => $user->type->present(),
            ],
        ], $status);
    }

    /**
     * Normalize and validate a Saudi mobile number.
     */
    private function validPhone(string $phone): string
    {
        if (! Phone::isValidSaudiMobile($phone)) {
            throw new DomainException('يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05.', 'invalid_phone');
        }

        return Phone::normalize($phone);
    }
}
