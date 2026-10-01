<?php

namespace App\Http\Resources;

use App\Models\CarrierService;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CarrierService
 */
class CarrierServiceResource extends JsonResource
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
            'code' => $this->code,
            'name' => $this->name_ar,
            'eta_min_days' => $this->eta_min_days,
            'eta_max_days' => $this->eta_max_days,
            'max_weight_kg' => (float) $this->max_weight_kg,
            'is_active' => $this->is_active,
            'rates' => $this->whenLoaded('rates', fn () => $this->rates->map(fn ($rate) => [
                'id' => $rate->id,
                'zone' => $rate->zone->present(),
                'base_weight_kg' => (float) $rate->base_weight_kg,
                'base_price' => Money::present($rate->base_price),
                'extra_kg_price' => Money::present($rate->extra_kg_price),
            ])),
        ];
    }
}
