<?php

namespace App\Actions\Pickups;

use App\Enums\PickupStatus;
use App\Enums\ShipmentStatus;
use App\Exceptions\DomainException;
use App\Models\Address;
use App\Models\Carrier;
use App\Models\Merchant;
use App\Models\Pickup;
use App\Services\Carriers\CarrierManager;
use Illuminate\Support\Facades\DB;

class SchedulePickupAction
{
    public function __construct(private CarrierManager $carriers) {}

    /**
     * Book a carrier pickup for the merchant's ready shipments.
     *
     * @param  list<int>  $shipmentIds
     */
    public function handle(Merchant $merchant, Carrier $carrier, Address $address, string $date, string $timeSlot, array $shipmentIds, ?string $notes = null): Pickup
    {
        if (! $carrier->supports_pickup) {
            throw new DomainException('شركة الشحن لا تدعم خدمة الاستلام من المتجر.', 'pickup_unsupported');
        }

        $shipments = $merchant->shipments()
            ->whereIn('id', $shipmentIds)
            ->where('carrier_id', $carrier->id)
            ->where('status', ShipmentStatus::Created)
            ->get();

        if ($shipments->isEmpty()) {
            throw new DomainException('اختر شحنة واحدة على الأقل جاهزة للاستلام من نفس شركة الشحن.', 'no_shipments');
        }

        return DB::transaction(function () use ($merchant, $carrier, $address, $date, $timeSlot, $notes, $shipments): Pickup {
            $pickup = $merchant->pickups()->create([
                'carrier_id' => $carrier->id,
                'address_id' => $address->id,
                'address' => $address->only(['name', 'phone', 'district', 'street', 'building_no', 'short_address']) + ['city' => $address->city->name_ar],
                'pickup_date' => $date,
                'time_slot' => $timeSlot,
                'shipments_count' => $shipments->count(),
                'status' => PickupStatus::Requested,
                'notes' => $notes,
            ]);

            $pickup->shipments()->attach($shipments->pluck('id'));
            $pickup->update([
                'carrier_reference' => $this->carriers->for($carrier)->schedulePickup($pickup),
                'status' => PickupStatus::Confirmed,
            ]);

            foreach ($shipments as $shipment) {
                $shipment->update(['status' => ShipmentStatus::PickupScheduled]);
                $shipment->events()->create([
                    'status' => ShipmentStatus::PickupScheduled,
                    'description' => 'تم جدولة موعد الاستلام '.$date.' ('.$timeSlot.')',
                    'occurred_at' => now(),
                ]);
            }

            return $pickup;
        });
    }
}
