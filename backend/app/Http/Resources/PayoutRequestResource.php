<?php

namespace App\Http\Resources;

use App\Models\PayoutRequest;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PayoutRequest
 */
class PayoutRequestResource extends JsonResource
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
            'amount' => Money::present($this->amount),
            'iban' => $this->iban,
            'bank_name' => $this->bank_name,
            'account_holder' => $this->account_holder,
            'status' => $this->status->present(),
            'transfer_reference' => $this->transfer_reference,
            'rejection_reason' => $this->rejection_reason,
            'merchant' => $this->whenLoaded('merchant', fn () => ['id' => $this->merchant->id, 'store_name' => $this->merchant->store_name]),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
