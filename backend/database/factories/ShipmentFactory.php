<?php

namespace Database\Factories;

use App\Enums\ShipmentStatus;
use App\Enums\ShipmentType;
use App\Enums\Zone;
use App\Models\CarrierService;
use App\Models\City;
use App\Models\Merchant;
use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Shipment>
 */
class ShipmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $service = CarrierService::query()->inRandomOrder()->first() ?? CarrierService::factory()->withRates()->create();
        $origin = City::query()->inRandomOrder()->first();
        $destination = City::query()->inRandomOrder()->first();

        return [
            'reference' => 'MS-'.now()->format('ym').'-'.Str::upper(Str::random(6)),
            'merchant_id' => Merchant::factory(),
            'carrier_id' => $service->carrier_id,
            'carrier_service_id' => $service->id,
            'type' => ShipmentType::Outbound,
            'source' => 'manual',
            'awb' => 'MCK'.fake()->unique()->numerify('##########'),
            'status' => ShipmentStatus::Created,
            'sender' => ['name' => fake()->name(), 'phone' => '+966551112222', 'city_id' => $origin->id, 'city' => $origin->name_ar],
            'recipient' => ['name' => fake()->name(), 'phone' => '+966553334444', 'city_id' => $destination->id, 'city' => $destination->name_ar],
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'zone' => Zone::InterRegion,
            'weight_kg' => 1,
            'chargeable_weight_kg' => 1,
            'carrier_cost' => 2000,
            'price' => 2300,
            'vat' => 345,
            'total' => 2645,
        ];
    }
}
