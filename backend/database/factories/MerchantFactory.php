<?php

namespace Database\Factories;

use App\Enums\MerchantRole;
use App\Enums\MerchantStatus;
use App\Models\Merchant;
use App\Models\Plan;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Merchant>
 */
class MerchantFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'store_name' => 'متجر '.fake()->word(),
            'phone' => '+9665'.fake()->numerify('########'),
            'plan_id' => Plan::factory(),
            'status' => MerchantStatus::Active,
        ];
    }

    /**
     * Attach an owner user and a funded wallet (balance in halalas).
     */
    public function withOwner(?User $owner = null, int $balance = 100000): static
    {
        return $this->afterCreating(function (Merchant $merchant) use ($owner, $balance): void {
            $owner ??= User::factory()->create();
            $merchant->users()->attach($owner->id, ['role' => MerchantRole::Owner->value]);
            $owner->update(['current_merchant_id' => $merchant->id]);
            Wallet::query()->create(['merchant_id' => $merchant->id, 'balance' => $balance]);
        });
    }
}
