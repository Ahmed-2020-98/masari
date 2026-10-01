<?php

namespace Tests\Feature\Actions\Shipments;

use App\Actions\Shipments\ApplyTrackingEventsAction;
use App\Enums\CodStatus;
use App\Enums\ShipmentStatus;
use App\Enums\WalletTransactionType;
use App\Models\Shipment;
use App\Services\Carriers\Data\TrackingEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplyTrackingEventsActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_delivery_marks_cod_collected_and_records_timeline(): void
    {
        [, $merchant] = $this->merchantWithOwner();
        $shipment = Shipment::factory()->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::OutForDelivery, 'cod_amount' => 20000, 'cod_status' => CodStatus::Pending]);

        app(ApplyTrackingEventsAction::class)->handle($shipment, [new TrackingEvent(ShipmentStatus::Delivered, 'تم التسليم', now())]);

        $shipment->refresh();
        $this->assertSame(ShipmentStatus::Delivered, $shipment->status);
        $this->assertSame(CodStatus::Collected, $shipment->cod_status);
        $this->assertNotNull($shipment->delivered_at);
        $this->assertDatabaseHas('shipment_events', ['shipment_id' => $shipment->id, 'status' => 'delivered']);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $merchant->users->first()->id]);
    }

    public function test_return_charges_plan_return_fee_and_cancels_cod(): void
    {
        [, $merchant] = $this->merchantWithOwner(5000);
        $shipment = Shipment::factory()->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::FailedAttempt, 'cod_amount' => 20000, 'cod_status' => CodStatus::Pending]);

        app(ApplyTrackingEventsAction::class)->handle($shipment, [new TrackingEvent(ShipmentStatus::Returned, 'مرتجع', now())]);

        $this->assertSame(CodStatus::Cancelled, $shipment->fresh()->cod_status);
        $this->assertSame(5000 - $merchant->plan->return_fee, $merchant->wallet->fresh()->balance);
        $this->assertDatabaseHas('wallet_transactions', ['type' => WalletTransactionType::ReturnFee->value]);
    }

    public function test_masari_track_command_advances_mock_shipments(): void
    {
        [, $merchant] = $this->merchantWithOwner();
        $shipment = Shipment::factory()->create(['merchant_id' => $merchant->id, 'status' => ShipmentStatus::Created, 'last_tracked_at' => now()->subHour()]);

        $this->artisan('masari:track')->assertSuccessful();

        $this->assertSame(ShipmentStatus::PickedUp, $shipment->fresh()->status);
    }
}
