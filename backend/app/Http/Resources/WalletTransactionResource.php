<?php

namespace App\Http\Resources;

use App\Models\WalletTransaction;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WalletTransaction
 */
class WalletTransactionResource extends JsonResource
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
            'type' => $this->type->present(),
            'amount' => Money::present($this->amount),
            'balance_after' => Money::present($this->balance_after),
            'description' => $this->description,
            'reference' => $this->reference_type ? ['type' => $this->reference_type, 'id' => $this->reference_id] : null,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
