<?php

namespace Database\Seeders;

use App\Enums\Zone;
use App\Models\Carrier;
use Illuminate\Database\Seeder;

class CarrierSeeder extends Seeder
{
    /**
     * Carriers with services and zone rate tables (costs in halalas, excl. VAT).
     * All use the mock driver until real API credentials are configured.
     */
    public function run(): void
    {
        // [code, name_ar, name_en, color, cod, pickup, returns, services[[code, name, etaMin, etaMax, [intra_city, intra_region, inter_region, remote], extraKg]]]
        $carriers = [
            ['smsa', 'سمسا', 'SMSA Express', '#1E3A8A', true, true, true, [['standard', 'الشحن القياسي', 2, 4, [1600, 1800, 2100, 2900], 150]]],
            ['aramex', 'أرامكس', 'Aramex', '#E1251B', true, true, true, [['domestic', 'الشحن المحلي', 2, 4, [1700, 1900, 2200, 3100], 200], ['express', 'الشحن السريع', 1, 2, [2400, 2600, 2900, 3900], 250]]],
            ['spl', 'البريد السعودي | سبل', 'SPL', '#0B7A3E', true, true, true, [['parcel', 'طرود سبل', 3, 5, [1300, 1500, 1800, 2400], 100]]],
            ['jt', 'جي آند تي', 'J&T Express', '#D7141A', true, true, true, [['standard', 'الشحن القياسي', 2, 5, [1400, 1600, 1900, 2600], 120]]],
            ['dhl', 'دي إتش إل', 'DHL', '#FFCC00', false, true, true, [['express', 'DHL السريع', 1, 2, [3200, 3400, 3700, 4500], 300]]],
            ['naqel', 'ناقل', 'Naqel Express', '#003B71', true, true, true, [['standard', 'الشحن القياسي', 2, 4, [1500, 1700, 2000, 2800], 130]]],
            ['imile', 'آي مايل', 'iMile', '#1A56DB', true, false, true, [['standard', 'الشحن الاقتصادي', 3, 6, [1200, 1400, 1700, 2500], 100]]],
            ['redbox', 'ريد بوكس', 'RedBox', '#DC2626', false, false, false, [['locker', 'التسليم عبر الخزائن الذكية', 1, 3, [1100, 1300, 1600, 2200], 100]]],
        ];

        $zones = [Zone::IntraCity, Zone::IntraRegion, Zone::InterRegion, Zone::Remote];

        foreach ($carriers as $sort => [$code, $nameAr, $nameEn, $color, $cod, $pickup, $returns, $services]) {
            $carrier = Carrier::query()->updateOrCreate(['code' => $code], [
                'name_ar' => $nameAr,
                'name_en' => $nameEn,
                'brand_color' => $color,
                'driver' => 'mock',
                'supports_cod' => $cod,
                'supports_pickup' => $pickup,
                'supports_returns' => $returns,
                'is_active' => true,
                'sort' => $sort,
            ]);

            foreach ($services as [$serviceCode, $serviceName, $etaMin, $etaMax, $prices, $extraKg]) {
                $service = $carrier->services()->updateOrCreate(['code' => $serviceCode], [
                    'name_ar' => $serviceName,
                    'eta_min_days' => $etaMin,
                    'eta_max_days' => $etaMax,
                    'max_weight_kg' => $code === 'redbox' ? 15 : 50,
                ]);

                foreach ($zones as $index => $zone) {
                    $service->rates()->updateOrCreate(['zone' => $zone], [
                        'base_weight_kg' => 15,
                        'base_price' => $prices[$index],
                        'extra_kg_price' => $extraKg,
                    ]);
                }
            }
        }
    }
}
