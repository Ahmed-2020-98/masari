<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\MerchantRole;
use App\Exceptions\DomainException;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Models\MerchantInvitation;
use App\Models\User;
use App\Services\Sms\SmsSender;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Members and pending invitations.
     */
    public function index(Request $request): JsonResponse
    {
        $merchant = $this->merchant($request);

        return response()->json([
            'members' => $merchant->users()->orderBy('merchant_user.created_at')->get()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
                'role' => MerchantRole::from($user->pivot->role)->present(),
                'is_me' => $user->id === $request->user()->id,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ]),
            'invitations' => $merchant->invitations()->whereNull('accepted_at')->where('expires_at', '>', now())->latest('id')->get()->map(fn (MerchantInvitation $invitation) => [
                'id' => $invitation->id,
                'name' => $invitation->name,
                'phone' => $invitation->phone,
                'role' => $invitation->role->present(),
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ]),
            'roles' => collect(MerchantRole::cases())->reject(fn (MerchantRole $role) => $role === MerchantRole::Owner)
                ->map(fn (MerchantRole $role) => $role->present() + ['abilities' => $role->abilities()])->values(),
        ]);
    }

    /**
     * Invite a team member by phone; they receive an SMS link.
     */
    public function invite(Request $request, SmsSender $sms): JsonResponse
    {
        $merchant = $this->merchant($request);
        $request->merge(['phone' => Phone::normalize((string) $request->input('phone'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'regex:/^\+9665\d{8}$/'],
            'role' => ['required', Rule::in([MerchantRole::Manager->value, MerchantRole::Operator->value, MerchantRole::Accountant->value])],
        ]);

        if ($merchant->users()->where('phone', $data['phone'])->exists()) {
            throw new DomainException('هذا الرقم عضو في الفريق بالفعل.', 'already_member');
        }

        $invitation = $merchant->invitations()->create($data + [
            'invited_by' => $request->user()->id,
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
        ]);

        $link = rtrim(config('masari.web_url'), '/').'/invite/'.$invitation->token;
        $sms->send($data['phone'], "دعاك {$merchant->store_name} للانضمام إلى فريقه في مساري: {$link}");

        return response()->json(['message' => 'تم إرسال الدعوة.', 'link' => $link], 201);
    }

    /**
     * Change a member's role.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role' => ['required', Rule::in([MerchantRole::Manager->value, MerchantRole::Operator->value, MerchantRole::Accountant->value])]]);
        $this->guardMember($request, $user);

        $this->merchant($request)->users()->updateExistingPivot($user->id, ['role' => $data['role']]);

        return response()->json(['message' => 'تم تحديث الصلاحية.']);
    }

    /**
     * Remove a member from the account.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->guardMember($request, $user);
        $this->merchant($request)->users()->detach($user->id);
        $user->tokens()->delete();

        return response()->json(['message' => 'تم حذف العضو من الفريق.']);
    }

    /**
     * Cancel a pending invitation.
     */
    public function cancelInvitation(Request $request, MerchantInvitation $invitation): JsonResponse
    {
        $this->ensureOwned($request, $invitation);
        $invitation->delete();

        return response()->json(['message' => 'تم إلغاء الدعوة.']);
    }

    /**
     * Owners cannot be edited and users cannot edit themselves.
     */
    private function guardMember(Request $request, User $user): void
    {
        $role = $user->roleIn($this->merchant($request));

        abort_if($role === null, 404);

        if ($role === MerchantRole::Owner || $user->id === $request->user()->id) {
            throw new DomainException('لا يمكن تعديل صلاحيات مالك الحساب أو حسابك الشخصي.', 'forbidden', 403);
        }
    }
}
