<?php

namespace Database\Seeders;

use App\Models\Region;
use Illuminate\Database\Seeder;

class GeoSeeder extends Seeder
{
    /**
     * Saudi Arabia's 13 administrative regions and main delivery cities.
     * Cities flagged `true` are treated as remote areas for pricing.
     */
    public function run(): void
    {
        $regions = [
            ['RD', 'منطقة الرياض', 'Riyadh', [
                ['الرياض', 'Riyadh'], ['الخرج', 'Al Kharj'], ['الدرعية', 'Diriyah'], ['المجمعة', 'Al Majmaah'], ['الزلفي', 'Az Zulfi'],
                ['الدوادمي', 'Ad Dawadimi'], ['وادي الدواسر', 'Wadi Ad Dawasir', true], ['عفيف', 'Afif', true], ['شقراء', 'Shaqra'], ['حوطة بني تميم', 'Hotat Bani Tamim'],
            ]],
            ['MK', 'منطقة مكة المكرمة', 'Makkah', [
                ['جدة', 'Jeddah'], ['مكة المكرمة', 'Makkah'], ['الطائف', 'Taif'], ['رابغ', 'Rabigh'], ['القنفذة', 'Al Qunfudhah', true], ['الليث', 'Al Lith', true], ['خليص', 'Khulais'],
            ]],
            ['MD', 'منطقة المدينة المنورة', 'Madinah', [
                ['المدينة المنورة', 'Madinah'], ['ينبع', 'Yanbu'], ['العلا', 'AlUla', true], ['بدر', 'Badr'], ['المهد', 'Al Mahd', true],
            ]],
            ['EP', 'المنطقة الشرقية', 'Eastern Province', [
                ['الدمام', 'Dammam'], ['الخبر', 'Khobar'], ['الظهران', 'Dhahran'], ['الأحساء', 'Al Ahsa'], ['الجبيل', 'Jubail'], ['القطيف', 'Qatif'],
                ['حفر الباطن', 'Hafar Al Batin'], ['الخفجي', 'Khafji', true], ['رأس تنورة', 'Ras Tanura'], ['بقيق', 'Abqaiq'],
            ]],
            ['QS', 'منطقة القصيم', 'Qassim', [
                ['بريدة', 'Buraidah'], ['عنيزة', 'Unaizah'], ['الرس', 'Ar Rass'], ['البكيرية', 'Al Bukayriyah'], ['المذنب', 'Al Midhnab'],
            ]],
            ['AS', 'منطقة عسير', 'Asir', [
                ['أبها', 'Abha'], ['خميس مشيط', 'Khamis Mushait'], ['بيشة', 'Bisha'], ['محايل عسير', 'Muhayil', true], ['النماص', 'An Namas', true],
            ]],
            ['TB', 'منطقة تبوك', 'Tabuk', [
                ['تبوك', 'Tabuk'], ['الوجه', 'Al Wajh', true], ['ضباء', 'Duba', true], ['تيماء', 'Tayma', true], ['نيوم', 'NEOM', true],
            ]],
            ['HA', 'منطقة حائل', 'Hail', [['حائل', 'Hail'], ['بقعاء', 'Baqaa', true]]],
            ['NB', 'منطقة الحدود الشمالية', 'Northern Borders', [['عرعر', 'Arar'], ['رفحاء', 'Rafha', true], ['طريف', 'Turaif', true]]],
            ['JZ', 'منطقة جازان', 'Jazan', [['جازان', 'Jazan'], ['صبيا', 'Sabya'], ['أبو عريش', 'Abu Arish'], ['صامطة', 'Samtah', true]]],
            ['NJ', 'منطقة نجران', 'Najran', [['نجران', 'Najran'], ['شرورة', 'Sharurah', true]]],
            ['BH', 'منطقة الباحة', 'Al Bahah', [['الباحة', 'Al Bahah'], ['بلجرشي', 'Baljurashi', true]]],
            ['JF', 'منطقة الجوف', 'Al Jouf', [['سكاكا', 'Sakaka'], ['دومة الجندل', 'Dumat Al Jandal', true], ['القريات', 'Qurayyat', true]]],
        ];

        foreach ($regions as [$code, $nameAr, $nameEn, $cities]) {
            $region = Region::query()->updateOrCreate(['code' => $code], ['name_ar' => $nameAr, 'name_en' => $nameEn]);

            foreach ($cities as $city) {
                $region->cities()->updateOrCreate(['name_en' => $city[1]], [
                    'name_ar' => $city[0],
                    'is_remote' => $city[2] ?? false,
                ]);
            }
        }
    }
}
