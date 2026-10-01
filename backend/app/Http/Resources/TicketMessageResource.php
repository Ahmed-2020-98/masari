<?php

namespace App\Http\Resources;

use App\Models\TicketMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TicketMessage
 */
class TicketMessageResource extends JsonResource
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
            'body' => $this->body,
            'is_staff' => $this->is_staff,
            'author' => $this->whenLoaded('user', fn () => $this->user?->name),
            'attachments' => collect($this->attachments ?? [])->map(fn (array $file) => ['name' => $file['name'], 'path' => $file['path']])->all(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
