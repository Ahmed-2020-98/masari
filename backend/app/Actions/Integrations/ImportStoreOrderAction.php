<?php

namespace App\Actions\Integrations;

use App\Actions\Shipments\CreateShipmentAction;
use App\Enums\StoreOrderStatus;
use App\Models\Address;
use App\Models\StoreConnection;
use App\Models\StoreOrder;
use App\Services\Integrations\IntegrationManager;
use Illuminate\Support\Facades\Log;
use Throwable;

class ImportStoreOrderAction
{
    public function __construct(private CreateShipmentAction $createShipment, private IntegrationManager $integrations) {}

    /**
     * Upsert the store order and auto-ship it when the connection is configured to.
     *
     * @param  array{external_id: string, number: string, customer: array<string, mixed>, items: list<array<string, mixed>>, total: int, payment_method: string|null, cod_amount: int, weight_kg: float, ordered_at: string|null}  $order
     */
    public function handle(StoreConnection $connection, array $order): StoreOrder
    {
        $storeOrder = StoreOrder::query()->firstOrNew([
            'store_connection_id' => $connection->id,
            'external_id' => $order['external_id'],
        ]);

        if ($storeOrder->exists && $storeOrder->status !== StoreOrderStatus::Pending) {
            return $storeOrder;
        }

        $storeOrder->fill([
            'merchant_id' => $connection->merchant_id,
            'number' => $order['number'],
            'customer' => $order['customer'],
            'items' => $order['items'],
            'total' => $order['total'],
            'payment_method' => $order['payment_method'],
            'cod_amount' => $order['cod_amount'],
            'weight_kg' => $order['weight_kg'],
            'ordered_at' => $order['ordered_at'] ?? now(),
            'status' => StoreOrderStatus::Pending,
        ])->save();

        $connection->update(['last_synced_at' => now()]);

        $this->autoShip($connection, $storeOrder);

        return $storeOrder;
    }

    /**
     * Create the shipment automatically if the merchant enabled auto-ship with a default service and sender.
     */
    private function autoShip(StoreConnection $connection, StoreOrder $storeOrder): void
    {
        $settings = $connection->settings ?? [];

        if (empty($settings['auto_ship']) || empty($settings['carrier_service_id']) || empty($storeOrder->customer['city_id'])) {
            return;
        }

        $sender = Address::query()->where('merchant_id', $connection->merchant_id)->whereKey($settings['sender_address_id'] ?? 0)->first();

        if (! $sender) {
            return;
        }

        try {
            $shipment = $this->createShipment->handle($connection->merchant, [
                'carrier_service_id' => (int) $settings['carrier_service_id'],
                'sender' => $sender->toArray(),
                'recipient' => $storeOrder->customer,
                'weight_kg' => (float) $storeOrder->weight_kg,
                'cod_amount' => $storeOrder->cod_amount,
                'contents' => collect($storeOrder->items)->pluck('name')->implode('، '),
                'declared_value' => $storeOrder->total,
                'order_number' => $storeOrder->number,
                'source' => $connection->platform->value,
            ]);

            $storeOrder->update(['status' => StoreOrderStatus::Shipped, 'shipment_id' => $shipment->id]);
            $this->integrations->for($connection->platform)->pushTracking($connection, $storeOrder->external_id, $shipment);
        } catch (Throwable $exception) {
            Log::warning('Auto-ship failed for store order', ['store_order' => $storeOrder->id, 'error' => $exception->getMessage()]);
        }
    }
}
