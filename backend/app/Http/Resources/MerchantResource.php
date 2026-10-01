<?php

namespace App\Http\Resources;

use App\Enums\MerchantRole;
use App\Models\Merchant;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Merchant
 */
class MerchantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'store_name' => $this->store_name,
            'store_url' => $this->store_url,
            'email' => $this->email,
            'phone' => $this->phone,
            'commercial_registration' => $this->commercial_registration,
            'vat_number' => $this->vat_number,
            'iban' => $this->iban,
            'bank_name' => $this->bank_name,
            'account_holder' => $this->account_holder,
            'status' => $this->status->present(),
            'monthly_volume' => $this->monthly_volume,
            'plan' => PlanResource::make($this->whenLoaded('plan')),
            'wallet_balance' => $this->whenLoaded('wallet', fn () => Money::present($this->wallet?->balance ?? 0)),
            'role' => $this->whenPivotLoaded('merchant_user', fn () => MerchantRole::from($this->pivot->role)->present()),
            'shipments_count' => $this->whenCounted('shipments'),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
