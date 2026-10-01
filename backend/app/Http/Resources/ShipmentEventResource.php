<?php

namespace App\Http\Resources;

use App\Models\ShipmentEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShipmentEvent
 */
class ShipmentEventResource extends JsonResource
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
            'status' => $this->status->present(),
            'description' => $this->description,
            'location' => $this->location,
            'occurred_at' => $this->occurred_at->toIso8601String(),
        ];
    }
}
