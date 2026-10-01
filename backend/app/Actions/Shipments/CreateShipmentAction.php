<?php

namespace App\Actions\Shipments;

use App\Enums\CodStatus;
use App\Enums\ShipmentStatus;
use App\Enums\ShipmentType;
use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Http\Resources\ShipmentResource;
use App\Models\CarrierService;
use App\Models\City;
use App\Models\Merchant;
use App\Models\Shipment;
use App\Models\User;
use App\Services\Carriers\CarrierManager;
use App\Services\Labels\LabelService;
use App\Services\Pricing\PricingService;
use App\Services\Wallet\WalletService;
use App\Services\Webhooks\WebhookDispatcher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CreateShipmentAction
{
    public function __construct(
        private PricingService $pricing,
        private WalletService $wallet,
        private CarrierManager $carriers,
        private LabelService $labels,
        private WebhookDispatcher $webhooks,
    ) {}

    /**
     * Price the shipment, charge the wallet, register it with the carrier and render the label.
     *
     * @param  array{
     *     carrier_service_id: int,
     *     sender: array<string, mixed>,
     *     recipient: array<string, mixed>,
     *     weight_kg: float|int|string,
     *     dimensions?: array{length?: float|int|null, width?: float|int|null, height?: float|int|null}|null,
     *     pieces?: int,
     *     contents?: string|null,
     *     declared_value?: int,
     *     cod_amount?: int,
     *     order_number?: string|null,
     *     notes?: string|null,
     *     source?: string,
     *     type?: ShipmentType,
     *     parent_id?: int|null,
     * }  $data
     */
    public function handle(Merchant $merchant, array $data, ?User $user = null): Shipment
    {
        $service = CarrierService::query()->with('carrier')->findOrFail($data['carrier_service_id']);
        $origin = City::query()->findOrFail($data['sender']['city_id']);
        $destination = City::query()->findOrFail($data['recipient']['city_id']);
        $codAmount = (int) ($data['cod_amount'] ?? 0);
        $type = $data['type'] ?? ShipmentType::Outbound;

        $quote = $this->pricing->quote($merchant, $service, $origin, $destination, (float) $data['weight_kg'], $data['dimensions'] ?? null, $codAmount);

        if (! $quote) {
            throw new DomainException('خدمة الشحن المختارة غير متاحة لهذا المسار أو الوزن.', 'service_unavailable');
        }

        $shipment = DB::transaction(function () use ($merchant, $data, $service, $origin, $destination, $codAmount, $type, $quote, $user): Shipment {
            $shipment = Shipment::create([
                'reference' => $this->reference(),
                'merchant_id' => $merchant->id,
                'created_by' => $user?->id,
                'carrier_id' => $service->carrier_id,
                'carrier_service_id' => $service->id,
                'type' => $type,
                'parent_id' => $data['parent_id'] ?? null,
                'source' => $data['source'] ?? 'manual',
                'status' => ShipmentStatus::Created,
                'order_number' => $data['order_number'] ?? null,
                'sender' => $this->snapshot($data['sender'], $origin),
                'recipient' => $this->snapshot($data['recipient'], $destination),
                'origin_city_id' => $origin->id,
                'destination_city_id' => $destination->id,
                'zone' => $quote->zone,
                'pieces' => $data['pieces'] ?? 1,
                'weight_kg' => $data['weight_kg'],
                'chargeable_weight_kg' => $quote->chargeableWeight,
                'dimensions' => $data['dimensions'] ?? null,
                'contents' => $data['contents'] ?? null,
                'declared_value' => $data['declared_value'] ?? 0,
                'cod_amount' => $codAmount,
                'cod_status' => $codAmount > 0 ? CodStatus::Pending : null,
                'carrier_cost' => $quote->carrierCost,
                'price' => $quote->price,
                'vat' => $quote->vat,
                'total' => $quote->total,
                'price_breakdown' => $quote->breakdown(),
                'notes' => $data['notes'] ?? null,
            ]);

            $this->wallet->debit(
                $merchant,
                $quote->total,
                WalletTransactionType::ShipmentCharge,
                "رسوم شحنة {$shipment->reference} عبر {$service->carrier->name_ar}",
                $shipment,
                $user,
            );

            return $shipment;
        });

        try {
            $created = $this->carriers->for($service->carrier)->createShipment($shipment);
        } catch (Throwable $exception) {
            Log::error('Carrier rejected shipment', ['shipment' => $shipment->id, 'error' => $exception->getMessage()]);
            $this->rollback($merchant, $shipment, $user);

            throw new DomainException('تعذر إنشاء الشحنة لدى شركة الشحن، تم استرداد المبلغ إلى محفظتك.', 'carrier_error', 502);
        }

        $shipment->update(['awb' => $created->awb, 'last_tracked_at' => now()]);
        $shipment->events()->create([
            'status' => ShipmentStatus::Created,
            'description' => 'تم إنشاء بوليصة الشحن',
            'location' => $origin->name_ar,
            'occurred_at' => now(),
        ]);
        $shipment->update(['label_path' => $this->labels->generate($shipment)]);

        $this->webhooks->dispatch($merchant, 'shipment.created', ShipmentResource::make($shipment)->resolve());

        return $shipment->refresh();
    }

    /**
     * Refund and cancel a shipment the carrier refused.
     */
    private function rollback(Merchant $merchant, Shipment $shipment, ?User $user): void
    {
        DB::transaction(function () use ($merchant, $shipment, $user): void {
            $this->wallet->credit($merchant, $shipment->total, WalletTransactionType::ShipmentRefund, "استرداد شحنة {$shipment->reference}", $shipment, $user);
            $shipment->update(['status' => ShipmentStatus::Cancelled, 'cancelled_at' => now(), 'cod_status' => $shipment->cod_status ? CodStatus::Cancelled : null]);
        });
    }

    /**
     * Freeze the address on the shipment so later address edits don't rewrite history.
     *
     * @param  array<string, mixed>  $address
     * @return array<string, mixed>
     */
    private function snapshot(array $address, City $city): array
    {
        return [
            'name' => $address['name'],
            'phone' => $address['phone'],
            'email' => $address['email'] ?? null,
            'city_id' => $city->id,
            'city' => $city->name_ar,
            'district' => $address['district'] ?? null,
            'street' => $address['street'] ?? null,
            'building_no' => $address['building_no'] ?? null,
            'postal_code' => $address['postal_code'] ?? null,
            'short_address' => $address['short_address'] ?? null,
        ];
    }

    /**
     * Human friendly unique shipment reference, e.g. MS-2610-8K3P2Q.
     */
    private function reference(): string
    {
        do {
            $reference = 'MS-'.now()->format('ym').'-'.Str::upper(Str::random(6));
        } while (Shipment::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
