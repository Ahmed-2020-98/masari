<?php

namespace Database\Factories;

use App\Models\Address;
use App\Models\City;
use App\Models\Merchant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Address>
 */
class AddressFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'merchant_id' => Merchant::factory(),
            'type' => 'sender',
            'label' => 'المستودع الرئيسي',
            'name' => fake()->name(),
            'phone' => '+9665'.fake()->numerify('########'),
            'city_id' => City::query()->inRandomOrder()->value('id'),
            'district' => 'العليا',
            'street' => 'طريق الملك فهد',
            'is_default' => true,
        ];
    }
}
