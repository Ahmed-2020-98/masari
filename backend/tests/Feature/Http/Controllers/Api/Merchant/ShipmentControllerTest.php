<?php

namespace Tests\Feature\Http\Controllers\Api\Merchant;

use App\Enums\CodStatus;
use App\Enums\MerchantRole;
use App\Enums\ShipmentStatus;
use App\Enums\WalletTransactionType;
use App\Models\CarrierService;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShipmentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        Storage::fake('local');
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(int $senderAddressId, array $overrides = []): array
    {
        return array_replace_recursive([
            'carrier_service_id' => CarrierService::query()->whereRelation('carrier', 'code', 'smsa')->value('id'),
            'sender_address_id' => $senderAddressId,
            'recipient' => ['name' => 'عبدالله', 'phone' => '0551234567', 'city_id' => $this->cityId('Jeddah'), 'district' => 'الروضة'],
            'weight_kg' => 1,
            'cod_amount' => 150,
        ], $overrides);
    }

    public function test_creating_shipment_charges_wallet_issues_awb_and_label_and_returns_201(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner(100000);
        $sender = $this->senderAddress($merchant);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/merchant/shipments', $this->payload($sender->id))
            ->assertCreated()
            ->assertJsonPath('data.status.value', 'created')
            ->assertJsonPath('data.cod.amount.amount', 15000)
            ->assertJsonPath('data.recipient.phone', '+966551234567');

        $shipment = Shipment::query()->where('uuid', $response->json('data.id'))->firstOrFail();

        $this->assertNotNull($shipment->awb);
        $this->assertSame(CodStatus::Pending, $shipment->cod_status);
        Storage::disk('local')->assertExists($shipment->label_path);
        $this->assertSame(100000 - $shipment->total, $merchant->wallet->fresh()->balance);
        $this->assertDatabaseHas('wallet_transactions', ['type' => WalletTransactionType::ShipmentCharge->value, 'amount' => -$shipment->total, 'reference_id' => $shipment->id]);
    }

    public function test_insufficient_balance_returns_402_and_creates_nothing(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner(100);
        $sender = $this->senderAddress($merchant);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/merchant/shipments', $this->payload($sender->id))
            ->assertStatus(402)
            ->assertJsonPath('code', 'insufficient_balance');

        $this->assertSame(0, Shipment::query()->count());
        $this->assertSame(100, $merchant->wallet->fresh()->balance);
    }

    public function test_invalid_recipient_phone_returns_422_with_arabic_message(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner();
        $sender = $this->senderAddress($merchant);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/merchant/shipments', $this->payload($sender->id, ['recipient' => ['phone' => '12345']]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['recipient.phone' => 'رقم جوال المستلم غير صحيح.']);
    }

    public function test_cancelling_shipment_refunds_wallet(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner(100000);
        $sender = $this->senderAddress($merchant);
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/merchant/shipments', $this->payload($sender->id))->json('data.id');

        $this->postJson("/api/v1/merchant/shipments/{$id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status.value', 'cancelled')
            ->assertJsonPath('data.cod.status.value', 'cancelled');

        $this->assertSame(100000, $merchant->wallet->fresh()->balance);
    }

    public function test_cancelling_picked_up_shipment_returns_422(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner();
        $shipment = Shipment::factory()->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::PickedUp]);
        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/merchant/shipments/{$shipment->uuid}/cancel")
            ->assertStatus(422)
            ->assertJsonPath('code', 'not_cancellable');
    }

    public function test_other_merchants_shipment_returns_404(): void
    {
        [$owner] = $this->merchantWithOwner();
        [, $otherMerchant] = $this->merchantWithOwner();
        $foreign = Shipment::factory()->create(['merchant_id' => $otherMerchant->id]);
        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/merchant/shipments/{$foreign->uuid}")->assertNotFound();
        $this->postJson("/api/v1/merchant/shipments/{$foreign->uuid}/cancel")->assertNotFound();
        $this->getJson('/api/v1/merchant/shipments')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_accountant_role_cannot_create_shipments_and_gets_403(): void
    {
        [, $merchant] = $this->merchantWithOwner();
        $accountant = User::factory()->create(['current_merchant_id' => $merchant->id]);
        $merchant->users()->attach($accountant->id, ['role' => MerchantRole::Accountant->value]);
        Sanctum::actingAs($accountant);

        $this->getJson('/api/v1/merchant/shipments')->assertForbidden();
        $this->getJson('/api/v1/merchant/wallet')->assertOk();
    }

    public function test_index_filters_by_status_and_searches_recipient_phone(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner();
        Shipment::factory()->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::Delivered, 'recipient' => ['name' => 'أ', 'phone' => '+966559990000', 'city' => 'جدة']]);
        Shipment::factory()->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::Created]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/merchant/shipments?filter[status]=delivered')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/merchant/shipments?filter[search]=559990000')->assertJsonCount(1, 'data')->assertJsonPath('data.0.status.value', 'delivered');
    }
}
