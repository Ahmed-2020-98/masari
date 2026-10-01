<?php

namespace Tests\Feature\Services\Pricing;

use App\Enums\Zone;
use App\Models\CarrierService;
use App\Models\City;
use App\Models\MerchantRateOverride;
use App\Services\Pricing\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    private PricingService $pricing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        $this->pricing = app(PricingService::class);
    }

    public function test_resolves_zone_from_origin_and_destination(): void
    {
        $riyadh = City::query()->where('name_en', 'Riyadh')->first();

        $this->assertSame(Zone::IntraCity, $this->pricing->zoneFor($riyadh, $riyadh));
        $this->assertSame(Zone::IntraRegion, $this->pricing->zoneFor($riyadh, City::query()->where('name_en', 'Al Kharj')->first()));
        $this->assertSame(Zone::InterRegion, $this->pricing->zoneFor($riyadh, City::query()->where('name_en', 'Jeddah')->first()));
        $this->assertSame(Zone::Remote, $this->pricing->zoneFor($riyadh, City::query()->where('name_en', 'NEOM')->first()));
    }

    public function test_chargeable_weight_uses_volumetric_weight_when_larger_and_rounds_up_to_half_kilo(): void
    {
        $this->assertSame(2.5, $this->pricing->chargeableWeight(1.0, ['length' => 30, 'width' => 20, 'height' => 20]));
        $this->assertSame(1.5, $this->pricing->chargeableWeight(1.2, ['length' => 10, 'width' => 10, 'height' => 10]));
        $this->assertSame(0.5, $this->pricing->chargeableWeight(0.1));
    }

    public function test_price_applies_plan_markup_cod_fee_extra_kilos_and_vat(): void
    {
        [, $merchant] = $this->merchantWithOwner();
        $service = CarrierService::query()->whereRelation('carrier', 'code', 'smsa')->first();
        $riyadh = City::query()->where('name_en', 'Riyadh')->first();
        $jeddah = City::query()->where('name_en', 'Jeddah')->first();

        // SMSA inter-region: 21.00 base up to 15kg + 1.50 per extra kg. Basic plan: 15% markup, 5.00 COD fee.
        $quote = $this->pricing->quote($merchant, $service, $riyadh, $jeddah, 17, null, 10000);

        $this->assertSame(2400, $quote->carrierCost);
        $this->assertSame(360, $quote->markup);
        $this->assertSame(500, $quote->codFee);
        $this->assertSame(3260, $quote->price);
        $this->assertSame(489, $quote->vat);
        $this->assertSame(3749, $quote->total);
    }

    public function test_merchant_override_replaces_plan_markup(): void
    {
        [, $merchant] = $this->merchantWithOwner();
        $service = CarrierService::query()->whereRelation('carrier', 'code', 'smsa')->first();
        MerchantRateOverride::create(['merchant_id' => $merchant->id, 'carrier_service_id' => $service->id, 'markup_type' => 'fixed', 'markup_value' => 100]);
        $riyadh = City::query()->where('name_en', 'Riyadh')->first();

        $quote = $this->pricing->quote($merchant, $service, $riyadh, $riyadh, 1);

        $this->assertSame(1600, $quote->carrierCost);
        $this->assertSame(100, $quote->markup);
    }

    public function test_excludes_carriers_without_cod_support_for_cod_shipments(): void
    {
        $riyadh = City::query()->where('name_en', 'Riyadh')->first();

        $codes = $this->pricing->quotes(null, $riyadh, $riyadh, 1, null, 5000)->map(fn ($quote) => $quote->service->carrier->code);

        $this->assertNotContains('dhl', $codes);
        $this->assertContains('smsa', $codes);
    }
}
