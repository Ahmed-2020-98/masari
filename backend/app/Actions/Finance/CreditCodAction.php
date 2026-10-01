<?php

namespace App\Actions\Finance;

use App\Enums\CodStatus;
use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Models\Carrier;
use App\Models\CodSettlement;
use App\Models\Shipment;
use App\Models\User;
use App\Services\MerchantNotifier;
use App\Services\Wallet\WalletService;
use App\Services\Webhooks\WebhookDispatcher;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

class CreditCodAction
{
    public function __construct(
        private WalletService $wallet,
        private MerchantNotifier $notifier,
        private WebhookDispatcher $webhooks,
    ) {}

    /**
     * Reconcile a carrier remittance: credit each collected COD amount to its merchant wallet.
     *
     * @param  list<int>  $shipmentIds
     */
    public function handle(Carrier $carrier, array $shipmentIds, User $admin, ?string $reference = null, ?string $remittedOn = null, ?string $notes = null): CodSettlement
    {
        $shipments = Shipment::query()
            ->with('merchant')
            ->whereIn('id', $shipmentIds)
            ->where('carrier_id', $carrier->id)
            ->where('cod_status', CodStatus::Collected)
            ->get();

        if ($shipments->isEmpty()) {
            throw new DomainException('لا توجد شحنات محصّلة قابلة للتسوية ضمن التحديد.', 'nothing_to_settle');
        }

        $settlement = DB::transaction(function () use ($carrier, $shipments, $admin, $reference, $remittedOn, $notes): CodSettlement {
            $settlement = CodSettlement::create([
                'carrier_id' => $carrier->id,
                'reference' => $reference,
                'shipments_count' => $shipments->count(),
                'total_amount' => $shipments->sum('cod_amount'),
                'remitted_on' => $remittedOn ?? now()->toDateString(),
                'created_by' => $admin->id,
                'notes' => $notes,
            ]);

            foreach ($shipments as $shipment) {
                $this->wallet->credit(
                    $shipment->merchant,
                    $shipment->cod_amount,
                    WalletTransactionType::CodCredit,
                    "مبلغ التحصيل للشحنة {$shipment->awb}",
                    $shipment,
                    $admin,
                );

                $shipment->update(['cod_status' => CodStatus::Credited, 'cod_settlement_id' => $settlement->id, 'cod_credited_at' => now()]);
            }

            return $settlement;
        });

        $shipments->groupBy('merchant_id')->each(function ($merchantShipments): void {
            $merchant = $merchantShipments->first()->merchant;
            $total = $merchantShipments->sum('cod_amount');

            $this->notifier->notify($merchant, 'cod.credited', 'تم إيداع مبالغ التحصيل', 'أضيف '.Money::format($total).' إلى محفظتك من '.$merchantShipments->count().' شحنة.', [], 'green');
            $this->webhooks->dispatch($merchant, 'wallet.credited', ['type' => 'cod', 'amount' => Money::present($total), 'awbs' => $merchantShipments->pluck('awb')->all()]);
        });

        return $settlement;
    }
}
