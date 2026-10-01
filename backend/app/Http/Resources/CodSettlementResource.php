<?php

namespace App\Http\Resources;

use App\Models\CodSettlement;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CodSettlement
 */
class CodSettlementResource extends JsonResource
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
            'carrier' => CarrierResource::make($this->whenLoaded('carrier')),
            'reference' => $this->reference,
            'shipments_count' => $this->shipments_count,
            'total_amount' => Money::present($this->total_amount),
            'remitted_on' => $this->remitted_on?->toDateString(),
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
