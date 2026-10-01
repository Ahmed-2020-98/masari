<?php

namespace App\Http\Resources;

use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Address
 */
class AddressResource extends JsonResource
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
            'type' => $this->type,
            'label' => $this->label,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'city_id' => $this->city_id,
            'city' => CityResource::make($this->whenLoaded('city')),
            'district' => $this->district,
            'street' => $this->street,
            'building_no' => $this->building_no,
            'postal_code' => $this->postal_code,
            'short_address' => $this->short_address,
            'notes' => $this->notes,
            'is_default' => $this->is_default,
        ];
    }
}
