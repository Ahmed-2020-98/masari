<?php

namespace App\Http\Resources;

use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin City
 */
class CityResource extends JsonResource
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
            'name' => $this->name_ar,
            'name_en' => $this->name_en,
            'region_id' => $this->region_id,
            'region' => $this->whenLoaded('region', fn () => $this->region->name_ar),
            'is_remote' => $this->is_remote,
        ];
    }
}
