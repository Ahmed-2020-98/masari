<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\OtpPurpose;
use App\Enums\UserType;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\MerchantInvitation;
use App\Models\User;
use App\Services\Auth\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class InvitationController extends Controller
{
    /**
     * Public invitation details shown on the accept page.
     */
    public function show(string $token): JsonResponse
    {
        $invitation = $this->pending($token);

        return response()->json([
            'store_name' => $invitation->merchant->store_name,
            'name' => $invitation->name,
            'phone' => $invitation->phone,
            'role' => $invitation->role->present(),
            'has_account' => User::query()->where('phone', $invitation->phone)->exists(),
        ]);
    }

    /**
     * Accept the invitation after verifying the invited phone number.
     */
    public function accept(Request $request, string $token, OtpService $otp): JsonResponse
    {
        $invitation = $this->pending($token);
        $existing = User::query()->where('phone', $invitation->phone)->first();

        $data = $request->validate([
            'verification_token' => ['required', 'string'],
            'name' => [$existing ? 'nullable' : 'required', 'string', 'max:120'],
            'password' => [$existing ? 'nullable' : 'required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $otp->consume($data['verification_token'], $invitation->phone, OtpPurpose::Invitation);

        DB::transaction(function () use ($invitation, $existing, $data): void {
            $user = $existing ?? User::create([
                'name' => $data['name'],
                'phone' => $invitation->phone,
                'phone_verified_at' => now(),
                'password' => $data['password'],
                'type' => UserType::Merchant,
            ]);

            $invitation->merchant->users()->syncWithoutDetaching([$user->id => ['role' => $invitation->role->value]]);
            $user->update(['current_merchant_id' => $invitation->merchant_id]);
            $invitation->update(['accepted_at' => now()]);
        });

        return response()->json(['message' => 'تم قبول الدعوة، يمكنك تسجيل الدخول الآن.']);
    }

    /**
     * Find a pending, unexpired invitation.
     */
    private function pending(string $token): MerchantInvitation
    {
        $invitation = MerchantInvitation::query()->with('merchant')->where('token', $token)->first();

        if (! $invitation || $invitation->accepted_at || $invitation->expires_at->isPast()) {
            throw new DomainException('رابط الدعوة غير صالح أو منتهي الصلاحية.', 'invitation_invalid', 404);
        }

        return $invitation;
    }
}
