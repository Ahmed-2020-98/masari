<?php

namespace App\Services\Pricing;

use App\Enums\Zone;
use App\Models\CarrierRate;
use App\Models\CarrierService;
use App\Models\City;
use App\Models\Merchant;
use App\Models\MerchantRateOverride;
use App\Models\Plan;
use Illuminate\Support\Collection;

class PricingService
{
    /**
     * Quote every active carrier service for the lane, cheapest first.
     *
     * @param  array{length?: float|int|null, width?: float|int|null, height?: float|int|null}|null  $dimensions
     * @return Collection<int, Quote>
     */
    public function quotes(?Merchant $merchant, City $origin, City $destination, float $weightKg, ?array $dimensions = null, int $codAmount = 0): Collection
    {
        $zone = $this->zoneFor($origin, $destination);
        $chargeable = $this->chargeableWeight($weightKg, $dimensions);
        $plan = $this->planFor($merchant);
        $overrides = $merchant
            ? MerchantRateOverride::query()->where('merchant_id', $merchant->id)->get()->keyBy('carrier_service_id')
            : collect();

        $rates = CarrierRate::query()
            ->where('zone', $zone)
            ->whereHas('service', fn ($query) => $query->where('is_active', true)->where('max_weight_kg', '>=', $chargeable)
                ->whereHas('carrier', fn ($carrier) => $carrier->where('is_active', true)))
            ->with('service.carrier')
            ->get();

        return $rates
            ->filter(fn (CarrierRate $rate): bool => $codAmount === 0 || $rate->service->carrier->supports_cod)
            ->map(fn (CarrierRate $rate): Quote => $this->price($rate, $zone, $chargeable, $plan, $overrides->get($rate->carrier_service_id), $codAmount))
            ->sortBy([['total', 'asc'], [fn (Quote $quote) => $quote->service->eta_max_days, 'asc']])
            ->values();
    }

    /**
     * Quote a single carrier service; null when the service does not cover the lane.
     *
     * @param  array{length?: float|int|null, width?: float|int|null, height?: float|int|null}|null  $dimensions
     */
    public function quote(?Merchant $merchant, CarrierService $service, City $origin, City $destination, float $weightKg, ?array $dimensions = null, int $codAmount = 0): ?Quote
    {
        return $this->quotes($merchant, $origin, $destination, $weightKg, $dimensions, $codAmount)
            ->first(fn (Quote $quote): bool => $quote->service->is($service));
    }

    /**
     * Resolve the pricing zone between two cities.
     */
    public function zoneFor(City $origin, City $destination): Zone
    {
        return match (true) {
            $destination->is_remote => Zone::Remote,
            $origin->is($destination) => Zone::IntraCity,
            $origin->region_id === $destination->region_id => Zone::IntraRegion,
            default => Zone::InterRegion,
        };
    }

    /**
     * Greater of actual and volumetric weight, rounded up to the next half kilo.
     *
     * @param  array{length?: float|int|null, width?: float|int|null, height?: float|int|null}|null  $dimensions
     */
    public function chargeableWeight(float $weightKg, ?array $dimensions = null): float
    {
        $volumetric = 0.0;

        if ($dimensions && ! empty($dimensions['length']) && ! empty($dimensions['width']) && ! empty($dimensions['height'])) {
            $volumetric = ($dimensions['length'] * $dimensions['width'] * $dimensions['height']) / config('masari.volumetric_divisor');
        }

        return max(0.5, ceil(max($weightKg, $volumetric) * 2) / 2);
    }

    /**
     * The merchant's plan, falling back to the default public plan.
     */
    public function planFor(?Merchant $merchant): ?Plan
    {
        return $merchant?->plan ?? Plan::query()->where('is_default', true)->first();
    }

    /**
     * Apply carrier cost, markup, COD fee and VAT for a rate.
     */
    private function price(CarrierRate $rate, Zone $zone, float $chargeable, ?Plan $plan, ?MerchantRateOverride $override, int $codAmount): Quote
    {
        $extraKg = max(0, (int) ceil($chargeable - (float) $rate->base_weight_kg));
        $cost = $rate->base_price + ($extraKg * $rate->extra_kg_price);

        [$markupType, $markupValue] = $override
            ? [$override->markup_type, $override->markup_value]
            : [$plan?->markup_type ?? 'percent', $plan?->markup_value ?? 0];

        $markup = $markupType === 'percent'
            ? (int) round($cost * $markupValue / 10000)
            : $markupValue;

        $codFee = $codAmount > 0 ? ($plan?->cod_fee ?? 0) : 0;
        $price = $cost + $markup + $codFee;
        $vat = (int) round($price * config('masari.vat_rate'));

        return new Quote(
            service: $rate->service,
            zone: $zone,
            chargeableWeight: $chargeable,
            carrierCost: $cost,
            markup: $markup,
            codFee: $codFee,
            price: $price,
            vat: $vat,
            total: $price + $vat,
        );
    }
}
