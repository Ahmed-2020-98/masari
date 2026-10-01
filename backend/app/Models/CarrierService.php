<?php

namespace App\Models;

use Database\Factories\CarrierServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['carrier_id', 'code', 'name_ar', 'eta_min_days', 'eta_max_days', 'max_weight_kg', 'is_active'])]
class CarrierService extends Model
{
    /** @use HasFactory<CarrierServiceFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'max_weight_kg' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Carrier, $this>
     */
    public function carrier(): BelongsTo
    {
        return $this->belongsTo(Carrier::class);
    }

    /**
     * @return HasMany<CarrierRate, $this>
     */
    public function rates(): HasMany
    {
        return $this->hasMany(CarrierRate::class);
    }
}
