<?php

namespace App\Models;

use App\Enums\Zone;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['carrier_service_id', 'zone', 'base_weight_kg', 'base_price', 'extra_kg_price'])]
class CarrierRate extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'zone' => Zone::class,
            'base_weight_kg' => 'decimal:2',
            'base_price' => 'integer',
            'extra_kg_price' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<CarrierService, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(CarrierService::class, 'carrier_service_id')->withDefault();
    }
}
