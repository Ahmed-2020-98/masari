<?php

namespace App\Http\Middleware;

use App\Enums\MerchantRole;
use App\Enums\MerchantStatus;
use App\Exceptions\DomainException;
use App\Models\Merchant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active merchant for the authenticated user (X-Merchant-Id header or current_merchant_id)
 * and optionally enforces a role ability: `merchant:shipments`.
 */
class ResolveMerchant
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $ability = null): Response
    {
        $user = $request->user();
        $merchantId = $request->header('X-Merchant-Id') ?: $user->current_merchant_id;

        /** @var Merchant|null $merchant */
        $merchant = $user->merchants()->when($merchantId, fn ($query) => $query->where('merchants.id', $merchantId))->first();

        if (! $merchant) {
            throw new DomainException('لا يوجد حساب تاجر مرتبط بهذا المستخدم.', 'no_merchant', 403);
        }

        if ($merchant->status === MerchantStatus::Suspended) {
            throw new DomainException('تم إيقاف حساب المتجر، يرجى التواصل مع الدعم الفني.', 'merchant_suspended', 403);
        }

        $role = MerchantRole::from($merchant->pivot->role);

        if ($ability && ! $role->can($ability)) {
            throw new DomainException('ليس لديك صلاحية للوصول إلى هذا القسم.', 'forbidden', 403);
        }

        $request->attributes->set('merchant', $merchant);
        $request->attributes->set('merchant_role', $role);

        return $next($request);
    }
}
