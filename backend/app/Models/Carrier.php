<?php

namespace App\Models;

use Database\Factories\CarrierFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name_ar', 'name_en', 'logo', 'brand_color', 'driver', 'credentials', 'supports_cod', 'supports_pickup', 'supports_returns', 'is_active', 'sort'])]
#[Hidden(['credentials'])]
class Carrier extends Model
{
    /** @use HasFactory<CarrierFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'supports_cod' => 'boolean',
            'supports_pickup' => 'boolean',
            'supports_returns' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<CarrierService, $this>
     */
    public function services(): HasMany
    {
        return $this->hasMany(CarrierService::class);
    }

    /**
     * @return HasMany<Shipment, $this>
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }
}
