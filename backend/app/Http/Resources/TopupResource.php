<?php

namespace App\Http\Resources;

use App\Models\Topup;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Topup
 */
class TopupResource extends JsonResource
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
            'method' => $this->method->present(),
            'amount' => Money::present($this->amount),
            'status' => $this->status->present(),
            'bank_name' => $this->bank_name,
            'transfer_reference' => $this->transfer_reference,
            'has_receipt' => (bool) $this->receipt_path,
            'rejection_reason' => $this->rejection_reason,
            'merchant' => $this->whenLoaded('merchant', fn () => ['id' => $this->merchant->id, 'store_name' => $this->merchant->store_name]),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
