<?php

namespace App\Http\Resources;

use App\Models\StoreConnection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StoreConnection
 */
class StoreConnectionResource extends JsonResource
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
            'platform' => $this->platform->present(),
            'store_id' => $this->store_id,
            'store_name' => $this->store_name,
            'store_url' => $this->store_url,
            'status' => $this->status,
            'settings' => [
                'auto_ship' => (bool) ($this->settings['auto_ship'] ?? false),
                'carrier_service_id' => $this->settings['carrier_service_id'] ?? null,
                'sender_address_id' => $this->settings['sender_address_id'] ?? null,
            ],
            'orders_count' => $this->whenCounted('orders'),
            'last_synced_at' => $this->last_synced_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
