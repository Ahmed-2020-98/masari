<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'الأساسية',
            'slug' => fake()->unique()->slug(2),
            'markup_type' => 'percent',
            'markup_value' => 1000,
            'cod_fee' => 500,
            'return_fee' => 1000,
            'monthly_fee' => 0,
            'is_default' => true,
            'is_active' => true,
        ];
    }
}
