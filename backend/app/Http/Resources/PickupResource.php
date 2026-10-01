<?php

namespace App\Http\Resources;

use App\Models\Pickup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Pickup
 */
class PickupResource extends JsonResource
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
            'address' => $this->address,
            'pickup_date' => $this->pickup_date->toDateString(),
            'time_slot' => $this->time_slot,
            'shipments_count' => $this->shipments_count,
            'status' => $this->status->present(),
            'carrier_reference' => $this->carrier_reference,
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
