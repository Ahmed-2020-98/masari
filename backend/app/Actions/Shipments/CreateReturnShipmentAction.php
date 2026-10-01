<?php

namespace App\Actions\Shipments;

use App\Enums\ShipmentStatus;
use App\Enums\ShipmentType;
use App\Exceptions\DomainException;
use App\Models\Shipment;
use App\Models\User;

class CreateReturnShipmentAction
{
    public function __construct(private CreateShipmentAction $createShipment) {}

    /**
     * Create a reverse shipment from the customer back to the merchant.
     */
    public function handle(Shipment $original, ?User $user = null, ?int $carrierServiceId = null, ?string $reason = null): Shipment
    {
        if ($original->status !== ShipmentStatus::Delivered) {
            throw new DomainException('يمكن إنشاء مرتجع للشحنات المسلّمة فقط.', 'not_returnable');
        }

        if (! $original->carrier->supports_returns && ! $carrierServiceId) {
            throw new DomainException('شركة الشحن لا تدعم المرتجعات، اختر شركة أخرى.', 'returns_unsupported');
        }

        return $this->createShipment->handle($original->merchant, [
            'carrier_service_id' => $carrierServiceId ?? $original->carrier_service_id,
            'sender' => $original->recipient,
            'recipient' => $original->sender,
            'weight_kg' => $original->weight_kg,
            'dimensions' => $original->dimensions,
            'pieces' => $original->pieces,
            'contents' => $original->contents,
            'order_number' => $original->order_number,
            'notes' => $reason,
            'source' => 'return',
            'type' => ShipmentType::Return,
            'parent_id' => $original->id,
        ], $user);
    }
}
