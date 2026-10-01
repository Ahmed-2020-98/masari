<?php

namespace Tests;

use App\Models\Address;
use App\Models\City;
use App\Models\Merchant;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\CarrierSeeder;
use Database\Seeders\GeoSeeder;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Seed cities, carriers, plans and roles used by most domain tests.
     */
    protected function seedReferenceData(): void
    {
        $this->seed([RoleSeeder::class, GeoSeeder::class, PlanSeeder::class, CarrierSeeder::class]);
    }

    /**
     * Create a merchant (on the default plan) with an owner and a funded wallet.
     *
     * @return array{0: User, 1: Merchant}
     */
    protected function merchantWithOwner(int $balance = 100000): array
    {
        $owner = User::factory()->create();
        $merchant = Merchant::factory()
            ->withOwner($owner, $balance)
            ->create(['plan_id' => Plan::query()->where('is_default', true)->value('id') ?? Plan::factory()]);

        return [$owner, $merchant];
    }

    /**
     * Default sender address in the given city (Riyadh by default).
     */
    protected function senderAddress(Merchant $merchant, string $cityEn = 'Riyadh'): Address
    {
        return Address::factory()->create([
            'merchant_id' => $merchant->id,
            'city_id' => City::query()->where('name_en', $cityEn)->value('id'),
        ]);
    }

    /**
     * City id by English name.
     */
    protected function cityId(string $nameEn): int
    {
        return City::query()->where('name_en', $nameEn)->value('id');
    }
}
