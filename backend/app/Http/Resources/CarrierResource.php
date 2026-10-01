<?php

namespace App\Http\Resources;

use App\Models\Carrier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Carrier
 */
class CarrierResource extends JsonResource
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
            'name_en' => $this->name_en,
            'logo' => $this->logo ? asset($this->logo) : null,
            'brand_color' => $this->brand_color,
            'supports_cod' => $this->supports_cod,
            'supports_pickup' => $this->supports_pickup,
            'supports_returns' => $this->supports_returns,
            'is_active' => $this->is_active,
            'driver' => $this->when($request->user()?->isAdmin(), $this->driver),
            'services' => CarrierServiceResource::collection($this->whenLoaded('services')),
        ];
    }
}
