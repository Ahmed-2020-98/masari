<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\MerchantRole;
use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\MerchantResource;
use App\Http\Resources\UserResource;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;

class MeController extends Controller
{
    /**
     * Everything a client needs after login in a single round trip.
     */
    public function bootstrap(Request $request): JsonResponse
    {
        $user = $request->user();
        $merchants = $user->merchants()->with(['plan', 'wallet'])->get();
        $current = $merchants->firstWhere('id', $user->current_merchant_id) ?? $merchants->first();
        $role = $current ? MerchantRole::from($current->pivot->role) : null;

        return response()->json([
            'user' => UserResource::make($user),
            'merchant' => $current ? MerchantResource::make($current) : null,
            'merchants' => $merchants->map(fn ($merchant) => ['id' => $merchant->id, 'store_name' => $merchant->store_name, 'role' => MerchantRole::from($merchant->pivot->role)->present()]),
            'role' => $role?->present(),
            'abilities' => $role?->abilities() ?? [],
            'admin_permissions' => $user->isAdmin() ? $user->getAllPermissions()->pluck('name') : [],
            'wallet' => $current ? Money::present($current->wallet?->balance ?? 0) : null,
            'unread_notifications' => $user->unreadNotifications()->count(),
            'open_tickets' => $current ? $current->tickets()->where('status', TicketStatus::Answered)->count() : 0,
            'config' => [
                'vat_rate' => config('masari.vat_rate'),
                'min_topup' => Money::present(config('masari.min_topup')),
                'min_payout' => Money::present(config('masari.min_payout')),
                'mobile_min_version' => config('masari.mobile.min_version'),
                'payment_driver' => config('masari.payments.driver'),
                'bank_accounts' => config('masari.payments.bank_accounts'),
            ],
        ]);
    }

    /**
     * Update the user's profile.
     */
    public function update(Request $request): UserResource
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->update($data);

        return UserResource::make($user);
    }

    /**
     * Change password and revoke other sessions.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();
        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()?->id)->delete();

        return response()->json(['message' => 'تم تحديث كلمة المرور.']);
    }

    /**
     * Switch the active merchant account.
     */
    public function switchMerchant(Request $request): JsonResponse
    {
        $data = $request->validate(['merchant_id' => ['required', 'integer']]);
        $user = $request->user();

        abort_unless($user->merchants()->where('merchants.id', $data['merchant_id'])->exists(), 404);

        $user->update(['current_merchant_id' => $data['merchant_id']]);

        return response()->json(['message' => 'تم تبديل الحساب.']);
    }

    /**
     * Active device sessions (API tokens).
     */
    public function sessions(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken();

        return response()->json([
            'data' => $request->user()->tokens()
                ->whereJsonDoesntContain('abilities', 'api')
                ->latest('last_used_at')
                ->get()
                ->map(fn (PersonalAccessToken $token) => [
                    'id' => $token->id,
                    'name' => $token->name,
                    'is_current' => $current && $token->id === $current->id,
                    'last_used_at' => $token->last_used_at?->toIso8601String(),
                    'created_at' => $token->created_at->toIso8601String(),
                ]),
        ]);
    }

    /**
     * Revoke a device session.
     */
    public function destroySession(Request $request, int $session): JsonResponse
    {
        $request->user()->tokens()->whereKey($session)->delete();

        return response()->json(['message' => 'تم إنهاء الجلسة.']);
    }

    /**
     * Register a push notification token for this device.
     */
    public function storeDeviceToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['required', Rule::in(['ios', 'android', 'web'])],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $request->user()->deviceTokens()->updateOrCreate(['token' => $data['token']], $data + ['last_used_at' => now()]);

        return response()->json(['message' => 'تم تسجيل الجهاز.'], 201);
    }

    /**
     * Remove a push notification token (on logout).
     */
    public function destroyDeviceToken(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string']]);
        $request->user()->deviceTokens()->where('token', $data['token'])->delete();

        return response()->json(['message' => 'تم حذف الجهاز.']);
    }
}
