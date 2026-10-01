<?php

namespace App\Http\Resources;

use App\Models\StoreOrder;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StoreOrder
 */
class StoreOrderResource extends JsonResource
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
            'platform' => $this->whenLoaded('storeConnection', fn () => $this->storeConnection->platform->present()),
            'store_name' => $this->whenLoaded('storeConnection', fn () => $this->storeConnection->store_name),
            'external_id' => $this->external_id,
            'number' => $this->number,
            'customer' => $this->customer,
            'items' => $this->items,
            'total' => Money::present($this->total),
            'payment_method' => $this->payment_method,
            'cod_amount' => Money::present($this->cod_amount),
            'weight_kg' => (float) $this->weight_kg,
            'status' => $this->status->present(),
            'shipment' => $this->whenLoaded('shipment', fn () => $this->shipment ? ['id' => $this->shipment->uuid, 'awb' => $this->shipment->awb] : null),
            'ordered_at' => $this->ordered_at?->toIso8601String(),
        ];
    }
}
