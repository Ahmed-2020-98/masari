<?php

namespace App\Http\Resources;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Ticket
 */
class TicketResource extends JsonResource
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
            'number' => $this->number,
            'subject' => $this->subject,
            'category' => $this->category->present(),
            'priority' => $this->priority,
            'status' => $this->status->present(),
            'shipment' => $this->whenLoaded('shipment', fn () => $this->shipment ? ['id' => $this->shipment->uuid, 'awb' => $this->shipment->awb] : null),
            'merchant' => $this->whenLoaded('merchant', fn () => ['id' => $this->merchant->id, 'store_name' => $this->merchant->store_name]),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name] : null),
            'messages' => TicketMessageResource::collection($this->whenLoaded('messages')),
            'last_reply_at' => $this->last_reply_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
