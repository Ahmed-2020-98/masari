<?php

namespace App\Services\Pricing;

use App\Enums\Zone;
use App\Models\CarrierService;
use App\Support\Money;

final readonly class Quote
{
    public function __construct(
        public CarrierService $service,
        public Zone $zone,
        public float $chargeableWeight,
        public int $carrierCost,
        public int $markup,
        public int $codFee,
        public int $price,
        public int $vat,
        public int $total,
    ) {}

    /**
     * Breakdown stored on the shipment and shown to the merchant.
     *
     * @return array<string, int|float|string>
     */
    public function breakdown(): array
    {
        return [
            'zone' => $this->zone->value,
            'chargeable_weight_kg' => $this->chargeableWeight,
            'shipping' => $this->carrierCost + $this->markup,
            'cod_fee' => $this->codFee,
            'price' => $this->price,
            'vat' => $this->vat,
            'total' => $this->total,
        ];
    }

    /**
     * API representation (carrier cost and markup are internal and never exposed to merchants).
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $carrier = $this->service->carrier;

        return [
            'carrier_service_id' => $this->service->id,
            'carrier' => [
                'id' => $carrier->id,
                'code' => $carrier->code,
                'name' => $carrier->name_ar,
                'logo' => $carrier->logo ? asset($carrier->logo) : null,
                'brand_color' => $carrier->brand_color,
                'supports_cod' => $carrier->supports_cod,
            ],
            'service' => ['code' => $this->service->code, 'name' => $this->service->name_ar],
            'eta' => [
                'min_days' => $this->service->eta_min_days,
                'max_days' => $this->service->eta_max_days,
                'label' => $this->service->eta_min_days === $this->service->eta_max_days
                    ? "{$this->service->eta_min_days} يوم عمل"
                    : "{$this->service->eta_min_days}-{$this->service->eta_max_days} أيام عمل",
            ],
            'zone' => $this->zone->present(),
            'chargeable_weight_kg' => $this->chargeableWeight,
            'shipping' => Money::present($this->carrierCost + $this->markup),
            'cod_fee' => Money::present($this->codFee),
            'price' => Money::present($this->price),
            'vat' => Money::present($this->vat),
            'total' => Money::present($this->total),
        ];
    }
}
