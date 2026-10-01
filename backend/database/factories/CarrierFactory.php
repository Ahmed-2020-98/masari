<?php

namespace Database\Factories;

use App\Models\Carrier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Carrier>
 */
class CarrierFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->lexify('carrier????'),
            'name_ar' => 'شركة شحن',
            'name_en' => 'Carrier',
            'driver' => 'mock',
            'brand_color' => '#0F2741',
            'supports_cod' => true,
            'supports_pickup' => true,
            'supports_returns' => true,
            'is_active' => true,
        ];
    }
}
