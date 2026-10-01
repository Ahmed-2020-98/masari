<?php

namespace App\Actions\Shipments;

use App\Enums\CodStatus;
use App\Enums\ShipmentStatus;
use App\Enums\WalletTransactionType;
use App\Http\Resources\ShipmentResource;
use App\Models\Shipment;
use App\Services\Carriers\Data\TrackingEvent;
use App\Services\MerchantNotifier;
use App\Services\Wallet\WalletService;
use App\Services\Webhooks\WebhookDispatcher;
use Illuminate\Support\Facades\DB;

class ApplyTrackingEventsAction
{
    public function __construct(
        private WalletService $wallet,
        private WebhookDispatcher $webhooks,
        private MerchantNotifier $notifier,
    ) {}

    /**
     * Persist carrier events and react to status transitions.
     *
     * @param  list<TrackingEvent>  $events
     */
    public function handle(Shipment $shipment, array $events): Shipment
    {
        if ($events === []) {
            $shipment->update(['last_tracked_at' => now()]);

            return $shipment;
        }

        $previous = $shipment->status;

        DB::transaction(function () use ($shipment, $events): void {
            foreach ($events as $event) {
                $shipment->events()->create([
                    'status' => $event->status,
                    'description' => $event->description,
                    'location' => $event->location,
                    'occurred_at' => $event->occurredAt,
                    'raw' => $event->raw ?: null,
                ]);
            }

            $latest = end($events);
            $attributes = ['status' => $latest->status, 'last_tracked_at' => now()];

            if ($latest->status === ShipmentStatus::Delivered) {
                $attributes['delivered_at'] = $latest->occurredAt;
                $attributes['cod_status'] = $shipment->isCod() ? CodStatus::Collected : null;
            }

            if ($latest->status === ShipmentStatus::Returned) {
                $attributes['cod_status'] = $shipment->isCod() ? CodStatus::Cancelled : null;
                $this->chargeReturnFee($shipment);
            }

            $shipment->update($attributes);
        });

        if ($shipment->status !== $previous) {
            $this->announce($shipment);
        }

        return $shipment;
    }

    /**
     * Charge the plan's return fee when a shipment comes back to the merchant.
     */
    private function chargeReturnFee(Shipment $shipment): void
    {
        $fee = $shipment->merchant->plan?->return_fee ?? 0;

        if ($fee > 0) {
            $this->wallet->debit($shipment->merchant, $fee, WalletTransactionType::ReturnFee, "رسوم إرجاع الشحنة {$shipment->reference}", $shipment, allowNegative: true);
        }
    }

    /**
     * Notify merchant users and webhook subscribers about the new status.
     */
    private function announce(Shipment $shipment): void
    {
        $payload = ShipmentResource::make($shipment)->resolve();

        $this->webhooks->dispatch($shipment->merchant, 'shipment.status_changed', $payload);

        if ($shipment->status === ShipmentStatus::Delivered) {
            $this->webhooks->dispatch($shipment->merchant, 'shipment.delivered', $payload);
        }

        if ($shipment->status === ShipmentStatus::Returned) {
            $this->webhooks->dispatch($shipment->merchant, 'shipment.returned', $payload);
        }

        if (in_array($shipment->status, [ShipmentStatus::Delivered, ShipmentStatus::FailedAttempt, ShipmentStatus::Returned], true)) {
            $this->notifier->notify(
                $shipment->merchant,
                'shipment.status',
                'تحديث على الشحنة '.$shipment->awb,
                $shipment->status->label().' — '.$shipment->recipient['name'],
                ['shipment_id' => $shipment->uuid, 'awb' => $shipment->awb],
                $shipment->status->color(),
            );
        }
    }
}
