<?php

namespace App\Http\Resources;

use App\Models\Shipment;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Shipment
 */
class ShipmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'reference' => $this->reference,
            'awb' => $this->awb,
            'type' => $this->type->present(),
            'source' => $this->source,
            'status' => $this->status->present(),
            'is_cancellable' => $this->status->isCancellable(),
            'order_number' => $this->order_number,
            'carrier' => CarrierResource::make($this->whenLoaded('carrier')),
            'service' => $this->whenLoaded('carrierService', fn () => [
                'id' => $this->carrierService->id,
                'code' => $this->carrierService->code,
                'name' => $this->carrierService->name_ar,
            ]),
            'sender' => $this->sender,
            'recipient' => $this->recipient,
            'zone' => $this->zone->present(),
            'pieces' => $this->pieces,
            'weight_kg' => (float) $this->weight_kg,
            'chargeable_weight_kg' => (float) $this->chargeable_weight_kg,
            'dimensions' => $this->dimensions,
            'contents' => $this->contents,
            'declared_value' => Money::present($this->declared_value),
            'cod' => [
                'amount' => Money::present($this->cod_amount),
                'status' => $this->cod_status?->present(),
                'credited_at' => $this->cod_credited_at?->toIso8601String(),
            ],
            'price' => Money::present($this->price),
            'vat' => Money::present($this->vat),
            'total' => Money::present($this->total),
            'carrier_cost' => $this->when($request->user()?->isAdmin(), fn () => Money::present($this->carrier_cost)),
            'merchant' => $this->when($request->user()?->isAdmin() && $this->relationLoaded('merchant'), fn () => [
                'id' => $this->merchant->id,
                'store_name' => $this->merchant->store_name,
            ]),
            'has_label' => (bool) $this->label_path,
            'tracking_url' => rtrim(config('masari.web_url'), '/').'/track/'.$this->awb,
            'events' => ShipmentEventResource::collection($this->whenLoaded('events')),
            'notes' => $this->notes,
            'parent_id' => $this->whenLoaded('parent', fn () => $this->parent?->uuid),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
