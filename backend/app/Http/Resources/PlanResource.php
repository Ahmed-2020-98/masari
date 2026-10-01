<?php

namespace App\Http\Resources;

use App\Models\Plan;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Plan
 */
class PlanResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'markup_type' => $this->when($request->user()?->isAdmin(), $this->markup_type),
            'markup_value' => $this->when($request->user()?->isAdmin(), $this->markup_value),
            'cod_fee' => Money::present($this->cod_fee),
            'return_fee' => Money::present($this->return_fee),
            'monthly_fee' => Money::present($this->monthly_fee),
            'features' => $this->features ?? [],
            'is_default' => $this->is_default,
            'is_active' => $this->is_active,
            'merchants_count' => $this->whenCounted('merchants'),
        ];
    }
}
