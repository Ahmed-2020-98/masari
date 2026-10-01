<?php

namespace App\Services\Carriers;

use App\Models\Pickup;
use App\Models\Shipment;
use App\Services\Carriers\Data\CreatedShipment;
use App\Services\Carriers\Data\TrackingEvent;

interface CarrierDriver
{
    /**
     * Register the shipment with the carrier and return its AWB.
     */
    public function createShipment(Shipment $shipment): CreatedShipment;

    /**
     * Cancel the shipment at the carrier. Returns false when the carrier refuses.
     */
    public function cancel(Shipment $shipment): bool;

    /**
     * Fetch tracking events newer than what we already stored.
     *
     * @return list<TrackingEvent>
     */
    public function track(Shipment $shipment): array;

    /**
     * Book a pickup and return the carrier's reference.
     */
    public function schedulePickup(Pickup $pickup): string;
}
