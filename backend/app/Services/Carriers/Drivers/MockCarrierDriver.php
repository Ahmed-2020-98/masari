<?php

namespace App\Services\Carriers\Drivers;

use App\Enums\ShipmentStatus;
use App\Models\Carrier;
use App\Models\Pickup;
use App\Models\Shipment;
use App\Services\Carriers\CarrierDriver;
use App\Services\Carriers\Data\CreatedShipment;
use App\Services\Carriers\Data\TrackingEvent;
use Illuminate\Support\Str;

/**
 * Simulates a carrier end-to-end so the whole platform works before real API credentials exist.
 * Every call to track() advances the shipment one step once enough time has passed.
 */
class MockCarrierDriver implements CarrierDriver
{
    /**
     * Happy path the simulation walks through.
     *
     * @var list<ShipmentStatus>
     */
    private const FLOW = [
        ShipmentStatus::Created,
        ShipmentStatus::PickedUp,
        ShipmentStatus::InTransit,
        ShipmentStatus::OutForDelivery,
        ShipmentStatus::Delivered,
    ];

    public function __construct(private Carrier $carrier) {}

    /**
     * Issue a pseudo AWB with the carrier's prefix.
     */
    public function createShipment(Shipment $shipment): CreatedShipment
    {
        $prefix = Str::upper(Str::substr($this->carrier->code, 0, 3));

        return new CreatedShipment(
            awb: $prefix.now()->format('ymd').random_int(100000, 999999),
            raw: ['driver' => 'mock'],
        );
    }

    /**
     * The mock carrier always accepts cancellations before pickup.
     */
    public function cancel(Shipment $shipment): bool
    {
        return $shipment->status->isCancellable();
    }

    /**
     * Advance the shipment one step through the simulated lifecycle.
     *
     * @return list<TrackingEvent>
     */
    public function track(Shipment $shipment): array
    {
        $stepMinutes = config('masari.mock_carrier.step_minutes');
        $lastUpdate = $shipment->last_tracked_at ?? $shipment->created_at;

        if ($lastUpdate->diffInMinutes(now()) < $stepMinutes) {
            return [];
        }

        $next = $this->nextStatus($shipment);

        if ($next === null) {
            return [];
        }

        return [new TrackingEvent(
            status: $next,
            description: $this->describe($next, $shipment),
            occurredAt: now(),
            location: $this->locationFor($next, $shipment),
            raw: ['driver' => 'mock'],
        )];
    }

    /**
     * Pickups are always confirmed with a generated reference.
     */
    public function schedulePickup(Pickup $pickup): string
    {
        return 'PU-'.Str::upper(Str::random(8));
    }

    /**
     * Pick the next status, occasionally injecting a failed attempt or a return.
     */
    private function nextStatus(Shipment $shipment): ?ShipmentStatus
    {
        $status = $shipment->status;

        if ($status === ShipmentStatus::FailedAttempt) {
            $failures = $shipment->events()->where('status', ShipmentStatus::FailedAttempt)->count();

            return $failures >= 2 ? ShipmentStatus::Returned : ShipmentStatus::OutForDelivery;
        }

        if ($status === ShipmentStatus::OutForDelivery && $this->roll()) {
            return ShipmentStatus::FailedAttempt;
        }

        if ($status === ShipmentStatus::PickupScheduled) {
            return ShipmentStatus::PickedUp;
        }

        $index = array_search($status, self::FLOW, true);

        return $index === false ? null : (self::FLOW[$index + 1] ?? null);
    }

    /**
     * Deterministic-per-shipment randomness so tests stay stable when the failure rate is zero.
     */
    private function roll(): bool
    {
        $rate = config('masari.mock_carrier.failure_rate');

        return $rate > 0 && (mt_rand() / mt_getrandmax()) < $rate;
    }

    /**
     * Human readable Arabic description of the event.
     */
    private function describe(ShipmentStatus $status, Shipment $shipment): string
    {
        return match ($status) {
            ShipmentStatus::PickedUp => 'تم استلام الشحنة من المرسل',
            ShipmentStatus::InTransit => 'الشحنة في الطريق إلى مدينة الوجهة',
            ShipmentStatus::OutForDelivery => 'الشحنة مع المندوب للتوصيل',
            ShipmentStatus::Delivered => 'تم تسليم الشحنة للمستلم',
            ShipmentStatus::FailedAttempt => 'تعذر التوصيل: لم يتم الرد على اتصال المندوب',
            ShipmentStatus::Returned => 'تمت إعادة الشحنة إلى المرسل',
            default => $status->label(),
        };
    }

    /**
     * Location attached to each simulated event.
     */
    private function locationFor(ShipmentStatus $status, Shipment $shipment): ?string
    {
        return match ($status) {
            ShipmentStatus::PickedUp, ShipmentStatus::Returned => $shipment->originCity?->name_ar,
            ShipmentStatus::InTransit => 'مركز فرز '.$this->carrier->name_ar,
            default => $shipment->destinationCity?->name_ar,
        };
    }
}
