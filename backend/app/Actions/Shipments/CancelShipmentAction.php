<?php

namespace App\Actions\Shipments;

use App\Enums\CodStatus;
use App\Enums\ShipmentStatus;
use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Http\Resources\ShipmentResource;
use App\Models\Shipment;
use App\Models\User;
use App\Services\Carriers\CarrierManager;
use App\Services\Wallet\WalletService;
use App\Services\Webhooks\WebhookDispatcher;
use Illuminate\Support\Facades\DB;

class CancelShipmentAction
{
    public function __construct(
        private CarrierManager $carriers,
        private WalletService $wallet,
        private WebhookDispatcher $webhooks,
    ) {}

    /**
     * Cancel the shipment at the carrier and refund the wallet.
     */
    public function handle(Shipment $shipment, ?User $user = null): Shipment
    {
        if (! $shipment->status->isCancellable()) {
            throw new DomainException('لا يمكن إلغاء الشحنة بعد استلامها من شركة الشحن.', 'not_cancellable');
        }

        if (! $this->carriers->for($shipment->carrier)->cancel($shipment)) {
            throw new DomainException('رفضت شركة الشحن طلب الإلغاء.', 'carrier_refused');
        }

        DB::transaction(function () use ($shipment, $user): void {
            $shipment->update([
                'status' => ShipmentStatus::Cancelled,
                'cancelled_at' => now(),
                'cod_status' => $shipment->cod_status ? CodStatus::Cancelled : null,
            ]);

            $shipment->events()->create([
                'status' => ShipmentStatus::Cancelled,
                'description' => 'تم إلغاء الشحنة',
                'occurred_at' => now(),
            ]);

            $this->wallet->credit($shipment->merchant, $shipment->total, WalletTransactionType::ShipmentRefund, "استرداد شحنة ملغاة {$shipment->reference}", $shipment, $user);
        });

        $this->webhooks->dispatch($shipment->merchant, 'shipment.cancelled', ShipmentResource::make($shipment)->resolve());

        return $shipment;
    }
}
