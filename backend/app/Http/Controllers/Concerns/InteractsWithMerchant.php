<?php

namespace App\Http\Controllers\Concerns;

use App\Enums\MerchantRole;
use App\Models\Merchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait InteractsWithMerchant
{
    /**
     * The merchant resolved by the `merchant` middleware.
     */
    protected function merchant(Request $request): Merchant
    {
        return $request->attributes->get('merchant');
    }

    /**
     * The acting user's role inside the merchant account.
     */
    protected function role(Request $request): MerchantRole
    {
        return $request->attributes->get('merchant_role');
    }

    /**
     * Abort with 404 when a bound model belongs to another merchant (tenant isolation).
     */
    protected function ensureOwned(Request $request, Model $model): void
    {
        abort_unless((int) $model->getAttribute('merchant_id') === $this->merchant($request)->id, 404);
    }
}
