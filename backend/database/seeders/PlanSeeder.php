<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Pricing plans: markup_value is basis points for percent (1500 = 15%).
     */
    public function run(): void
    {
        $plans = [
            ['basic', 'الأساسية', 'للمتاجر الناشئة، ادفع فقط عند الشحن.', 'percent', 1500, 500, 1000, 0, true,
                ['بدون اشتراك شهري', 'جميع شركات الشحن', 'الدفع عند الاستلام', 'دعم فني عبر التذاكر']],
            ['pro', 'الاحترافية', 'للمتاجر النامية بأسعار أقل على كل شحنة.', 'percent', 800, 400, 800, 9900, false,
                ['أسعار مخفضة على كل الشركات', 'ربط سلة وزد', 'رفع جماعي للشحنات', 'مدير حساب مخصص']],
            ['enterprise', 'الأعمال', 'للشركات ذات الأحجام الكبيرة بأسعار تفاوضية.', 'percent', 400, 300, 500, 49900, false,
                ['أفضل الأسعار', 'API ووِب هوك', 'تسويات أسبوعية للتحصيل', 'دعم أولوية 24/7']],
        ];

        foreach ($plans as $sort => [$slug, $name, $description, $type, $value, $codFee, $returnFee, $monthly, $default, $features]) {
            Plan::query()->updateOrCreate(['slug' => $slug], [
                'name' => $name,
                'description' => $description,
                'markup_type' => $type,
                'markup_value' => $value,
                'cod_fee' => $codFee,
                'return_fee' => $returnFee,
                'monthly_fee' => $monthly,
                'features' => $features,
                'is_default' => $default,
                'is_active' => true,
                'sort' => $sort,
            ]);
        }
    }
}
