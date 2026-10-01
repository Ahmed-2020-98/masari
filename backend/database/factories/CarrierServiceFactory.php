<?php

namespace Database\Factories;

use App\Enums\Zone;
use App\Models\Carrier;
use App\Models\CarrierService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CarrierService>
 */
class CarrierServiceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'carrier_id' => Carrier::factory(),
            'code' => 'standard',
            'name_ar' => 'الشحن القياسي',
            'eta_min_days' => 2,
            'eta_max_days' => 4,
            'max_weight_kg' => 50,
            'is_active' => true,
        ];
    }

    /**
     * Give the service a rate for every zone (base 15kg).
     */
    public function withRates(int $basePrice = 2000, int $extraKg = 200): static
    {
        return $this->afterCreating(function (CarrierService $service) use ($basePrice, $extraKg): void {
            foreach (Zone::cases() as $zone) {
                $service->rates()->create(['zone' => $zone, 'base_weight_kg' => 15, 'base_price' => $basePrice, 'extra_kg_price' => $extraKg]);
            }
        });
    }
}
