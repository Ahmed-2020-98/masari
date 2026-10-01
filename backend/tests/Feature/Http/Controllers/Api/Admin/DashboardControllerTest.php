<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\ShipmentStatus;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_kpis_carrier_split_and_top_merchants(): void
    {
        $this->seedReferenceData();
        [, $merchant] = $this->merchantWithOwner();
        Shipment::factory()->count(3)->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::Delivered]);
        $admin = User::factory()->admin()->create();
        $admin->assignRole('super_admin');
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/dashboard?days=30')
            ->assertOk()
            ->assertJsonPath('kpis.shipments', 3)
            ->assertJsonPath('kpis.delivery_rate', 100)
            ->assertJsonPath('top_merchants.0.id', $merchant->id)
            ->assertJsonCount(30, 'chart');
    }

    public function test_merchant_dashboard_returns_kpis_for_own_shipments_only(): void
    {
        $this->seedReferenceData();
        [$owner, $merchant] = $this->merchantWithOwner();
        [, $other] = $this->merchantWithOwner();
        Shipment::factory()->create(['merchant_id' => $merchant->id]);
        Shipment::factory()->count(2)->create(['merchant_id' => $other->id]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/merchant/dashboard')
            ->assertOk()
            ->assertJsonPath('kpis.total', 1)
            ->assertJsonCount(1, 'carriers');
    }
}
