<?php

namespace Database\Seeders;

use App\Enums\CodStatus;
use App\Enums\MerchantRole;
use App\Enums\MerchantStatus;
use App\Enums\PayoutStatus;
use App\Enums\ShipmentStatus;
use App\Enums\ShipmentType;
use App\Enums\StoreOrderStatus;
use App\Enums\StorePlatform;
use App\Enums\TicketCategory;
use App\Enums\TicketStatus;
use App\Enums\TopupMethod;
use App\Enums\TopupStatus;
use App\Enums\UserType;
use App\Enums\WalletTransactionType;
use App\Models\CarrierService;
use App\Models\City;
use App\Models\Merchant;
use App\Models\Plan;
use App\Models\Shipment;
use App\Models\User;
use App\Services\Pricing\PricingService;
use App\Services\Wallet\WalletService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    /**
     * Demo accounts and ~180 shipments of realistic history.
     *
     * Admin:    0500000001 / Masari@2026
     * Merchant: 0500000000 / password123
     */
    public function run(PricingService $pricing, WalletService $wallet): void
    {
        $admin = User::query()->updateOrCreate(['phone' => '+966500000001'], [
            'name' => 'مدير النظام',
            'email' => 'admin@masari.sa',
            'password' => 'Masari@2026',
            'type' => UserType::Admin,
            'phone_verified_at' => now(),
        ]);
        $admin->syncRoles(['super_admin']);

        $owner = User::query()->updateOrCreate(['phone' => '+966500000000'], [
            'name' => 'نايف العتيبي',
            'email' => 'nayef@example.com',
            'password' => 'password123',
            'type' => UserType::Merchant,
            'phone_verified_at' => now(),
        ]);

        $merchant = Merchant::query()->updateOrCreate(['phone' => '+966500000000'], [
            'name' => 'نايف العتيبي',
            'store_name' => 'متجر نسيم للعطور',
            'store_url' => 'https://naseem.store',
            'email' => 'hello@naseem.store',
            'commercial_registration' => '1010456789',
            'vat_number' => '310456789000003',
            'iban' => 'SA0380000000608010167519',
            'bank_name' => 'مصرف الراجحي',
            'account_holder' => 'مؤسسة نسيم للتجارة',
            'plan_id' => Plan::query()->where('slug', 'pro')->value('id'),
            'status' => MerchantStatus::Active,
        ]);
        $merchant->users()->syncWithoutDetaching([$owner->id => ['role' => MerchantRole::Owner->value]]);
        $owner->update(['current_merchant_id' => $merchant->id]);

        $operator = User::query()->updateOrCreate(['phone' => '+966500000002'], [
            'name' => 'سارة القحطاني', 'password' => 'password123', 'type' => UserType::Merchant, 'phone_verified_at' => now(), 'current_merchant_id' => $merchant->id,
        ]);
        $merchant->users()->syncWithoutDetaching([$operator->id => ['role' => MerchantRole::Operator->value]]);

        if ($merchant->shipments()->exists()) {
            return;
        }

        $riyadh = City::query()->where('name_en', 'Riyadh')->firstOrFail();
        $sender = $merchant->addresses()->create([
            'type' => 'sender', 'label' => 'المستودع الرئيسي', 'name' => 'متجر نسيم للعطور', 'phone' => '+966500000000',
            'city_id' => $riyadh->id, 'district' => 'الملقا', 'street' => 'طريق أنس بن مالك', 'building_no' => '8231', 'short_address' => 'RRMA8231', 'is_default' => true,
        ]);

        $this->topup($merchant, $wallet, 800000, 62);

        $cities = City::query()->where('is_active', true)->get();
        $weighted = $cities->whereIn('name_en', ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Khobar', 'Abha', 'Buraidah', 'Tabuk'])->values();
        $services = CarrierService::query()->with('carrier')->get();
        $names = ['محمد الشهري', 'عبدالله الدوسري', 'نورة السبيعي', 'فهد المطيري', 'ريم الزهراني', 'خالد الحربي', 'منيرة العنزي', 'سلطان القرني', 'هيا الشمري', 'تركي البقمي', 'لمى العمري', 'عبدالرحمن الغامدي', 'جود الرشيدي', 'بندر السلمي', 'أمل الجهني'];
        $districts = ['النرجس', 'الروضة', 'الصفا', 'الشاطئ', 'العزيزية', 'الحمراء', 'النسيم', 'الفيصلية', 'الملز', 'السليمانية'];

        for ($i = 0; $i < 180; $i++) {
            $createdAt = Carbon::now()->subDays(random_int(0, 59))->setTime(random_int(8, 22), random_int(0, 59));
            $destination = random_int(1, 10) <= 7 ? $weighted->random() : $cities->random();
            $service = $services->random();
            $cod = $service->carrier->supports_cod && random_int(1, 10) <= 6 ? random_int(8, 90) * 500 : 0;
            $weight = [0.5, 1, 1, 1.5, 2, 3, 5][array_rand([0.5, 1, 1, 1.5, 2, 3, 5])];
            $quote = $pricing->quote($merchant, $service, $riyadh, $destination, $weight, null, $cod);

            if (! $quote) {
                continue;
            }

            $status = $this->statusFor($createdAt);
            $name = $names[array_rand($names)];

            $shipment = Shipment::query()->create([
                'reference' => 'MS-'.$createdAt->format('ym').'-'.Str::upper(Str::random(6)),
                'merchant_id' => $merchant->id,
                'created_by' => $owner->id,
                'carrier_id' => $service->carrier_id,
                'carrier_service_id' => $service->id,
                'type' => ShipmentType::Outbound,
                'source' => ['manual', 'manual', 'salla', 'zid', 'bulk'][array_rand(['manual', 'manual', 'salla', 'zid', 'bulk'])],
                'awb' => Str::upper(Str::substr($service->carrier->code, 0, 3)).$createdAt->format('ymd').random_int(100000, 999999),
                'status' => $status,
                'order_number' => (string) (10000 + $i),
                'sender' => $sender->only(['name', 'phone', 'city_id', 'district', 'street', 'building_no', 'short_address']) + ['city' => $riyadh->name_ar],
                'recipient' => ['name' => $name, 'phone' => '+9665'.random_int(10000000, 99999999), 'city_id' => $destination->id, 'city' => $destination->name_ar, 'district' => $districts[array_rand($districts)], 'street' => 'شارع '.random_int(1, 60)],
                'origin_city_id' => $riyadh->id,
                'destination_city_id' => $destination->id,
                'zone' => $quote->zone,
                'weight_kg' => $weight,
                'chargeable_weight_kg' => $quote->chargeableWeight,
                'contents' => ['عطور', 'بخور', 'دهن عود', 'مجموعة هدايا', 'معطر مفارش'][array_rand(['عطور', 'بخور', 'دهن عود', 'مجموعة هدايا', 'معطر مفارش'])],
                'cod_amount' => $cod,
                'cod_status' => $cod > 0 ? $this->codStatusFor($status, $createdAt) : null,
                'carrier_cost' => $quote->carrierCost,
                'price' => $quote->price,
                'vat' => $quote->vat,
                'total' => $quote->total,
                'price_breakdown' => $quote->breakdown(),
                'delivered_at' => $status === ShipmentStatus::Delivered ? $createdAt->copy()->addDays(random_int(1, 4)) : null,
                'cancelled_at' => $status === ShipmentStatus::Cancelled ? $createdAt->copy()->addHours(2) : null,
                'last_tracked_at' => $createdAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $this->events($shipment, $createdAt, $riyadh->name_ar, $destination->name_ar);

            $charge = $wallet->debit($merchant, $quote->total, WalletTransactionType::ShipmentCharge, "رسوم شحنة {$shipment->reference} عبر {$service->carrier->name_ar}", $shipment, $owner, allowNegative: true);
            $charge->forceFill(['created_at' => $createdAt])->save();

            if ($status === ShipmentStatus::Cancelled) {
                $wallet->credit($merchant, $quote->total, WalletTransactionType::ShipmentRefund, "استرداد شحنة ملغاة {$shipment->reference}", $shipment)->forceFill(['created_at' => $createdAt->copy()->addHours(2)])->save();
            }

            if ($shipment->cod_status === CodStatus::Credited) {
                $shipment->update(['cod_credited_at' => $shipment->delivered_at->copy()->addDays(3)]);
                $wallet->credit($merchant, $cod, WalletTransactionType::CodCredit, "مبلغ التحصيل للشحنة {$shipment->awb}", $shipment)->forceFill(['created_at' => $shipment->cod_credited_at])->save();
            }
        }

        $this->extras($merchant, $owner, $wallet);
    }

    /**
     * Older shipments are mostly finished; recent ones are still moving.
     */
    private function statusFor(Carbon $createdAt): ShipmentStatus
    {
        $age = $createdAt->diffInDays(now());
        $roll = random_int(1, 100);

        if ($age >= 6) {
            return match (true) {
                $roll <= 86 => ShipmentStatus::Delivered,
                $roll <= 94 => ShipmentStatus::Returned,
                default => ShipmentStatus::Cancelled,
            };
        }

        return match (true) {
            $roll <= 25 => ShipmentStatus::Created,
            $roll <= 35 => ShipmentStatus::PickedUp,
            $roll <= 60 => ShipmentStatus::InTransit,
            $roll <= 75 => ShipmentStatus::OutForDelivery,
            $roll <= 80 => ShipmentStatus::FailedAttempt,
            default => ShipmentStatus::Delivered,
        };
    }

    /**
     * COD stage matching the shipment status.
     */
    private function codStatusFor(ShipmentStatus $status, Carbon $createdAt): CodStatus
    {
        return match ($status) {
            ShipmentStatus::Delivered => $createdAt->diffInDays(now()) > 10 ? CodStatus::Credited : CodStatus::Collected,
            ShipmentStatus::Returned, ShipmentStatus::Cancelled => CodStatus::Cancelled,
            default => CodStatus::Pending,
        };
    }

    /**
     * Build a believable timeline up to the shipment's status.
     */
    private function events(Shipment $shipment, Carbon $createdAt, string $origin, string $destination): void
    {
        $steps = [
            [ShipmentStatus::Created, 'تم إنشاء بوليصة الشحن', $origin],
            [ShipmentStatus::PickedUp, 'تم استلام الشحنة من المرسل', $origin],
            [ShipmentStatus::InTransit, 'الشحنة في الطريق إلى مدينة الوجهة', 'مركز فرز '.$shipment->carrier->name_ar],
            [ShipmentStatus::OutForDelivery, 'الشحنة مع المندوب للتوصيل', $destination],
        ];

        $final = match ($shipment->status) {
            ShipmentStatus::Delivered => [[ShipmentStatus::Delivered, 'تم تسليم الشحنة للمستلم', $destination]],
            ShipmentStatus::FailedAttempt => [[ShipmentStatus::FailedAttempt, 'تعذر التوصيل: لم يتم الرد على اتصال المندوب', $destination]],
            ShipmentStatus::Returned => [[ShipmentStatus::FailedAttempt, 'تعذر التوصيل: العميل رفض الاستلام', $destination], [ShipmentStatus::Returned, 'تمت إعادة الشحنة إلى المرسل', $origin]],
            ShipmentStatus::Cancelled => [[ShipmentStatus::Cancelled, 'تم إلغاء الشحنة', null]],
            default => [],
        };

        $reach = match ($shipment->status) {
            ShipmentStatus::Created, ShipmentStatus::Cancelled => 1,
            ShipmentStatus::PickedUp => 2,
            ShipmentStatus::InTransit => 3,
            default => 4,
        };

        $time = $createdAt->copy();

        foreach ([...array_slice($steps, 0, $reach), ...$final] as [$status, $description, $location]) {
            $shipment->events()->create(['status' => $status, 'description' => $description, 'location' => $location, 'occurred_at' => $time->copy()]);
            $time->addHours(random_int(5, 20));
        }
    }

    /**
     * Record a paid top-up in the past.
     */
    private function topup(Merchant $merchant, WalletService $wallet, int $amount, int $daysAgo): void
    {
        $topup = $merchant->topups()->create(['method' => TopupMethod::Card, 'amount' => $amount, 'status' => TopupStatus::Paid, 'gateway_reference' => 'chg_demo_'.Str::random(8)]);
        $topup->forceFill(['created_at' => now()->subDays($daysAgo)])->save();
        $wallet->credit($merchant, $amount, WalletTransactionType::Topup, 'شحن رصيد — بطاقة / مدى / Apple Pay', $topup)->forceFill(['created_at' => now()->subDays($daysAgo)])->save();
    }

    /**
     * Store orders, a pending bank top-up, a payout, and a support ticket.
     */
    private function extras(Merchant $merchant, User $owner, WalletService $wallet): void
    {
        $connection = $merchant->storeConnections()->create([
            'platform' => StorePlatform::Salla, 'store_id' => 'demo-'.$merchant->id, 'store_name' => $merchant->store_name,
            'store_url' => 'https://naseem.store', 'status' => 'active', 'settings' => ['auto_ship' => false, 'webhook_token' => Str::random(40)], 'last_synced_at' => now(),
        ]);

        $cities = City::query()->whereIn('name_en', ['Jeddah', 'Dammam', 'Abha', 'Hail', 'Madinah'])->get();

        foreach (range(1, 7) as $n) {
            $city = $cities->random();
            $total = random_int(12, 60) * 1000;
            $isCod = $n % 2 === 0;
            $connection->orders()->create([
                'merchant_id' => $merchant->id, 'external_id' => (string) (880000 + $n), 'number' => (string) (20450 + $n),
                'customer' => ['name' => ['رهف', 'ماجد', 'عبير', 'سعود', 'دانة', 'يزيد', 'شهد'][$n - 1].' '.['الحربي', 'العسيري', 'المالكي'][$n % 3], 'phone' => '+9665'.random_int(10000000, 99999999), 'city_id' => $city->id, 'city_name' => $city->name_ar, 'district' => 'الورود', 'street' => 'شارع '.random_int(1, 40)],
                'items' => [['name' => 'عطر مسك الليل 100 مل', 'quantity' => random_int(1, 3), 'sku' => 'NS-100']],
                'total' => $total, 'payment_method' => $isCod ? 'cod' : 'credit_card', 'cod_amount' => $isCod ? $total : 0,
                'weight_kg' => 1, 'status' => StoreOrderStatus::Pending, 'ordered_at' => now()->subHours($n * 3),
            ]);
        }

        $merchant->topups()->create(['user_id' => $owner->id, 'method' => TopupMethod::BankTransfer, 'amount' => 250000, 'status' => TopupStatus::Pending, 'receipt_path' => 'receipts/demo.pdf', 'bank_name' => 'مصرف الراجحي', 'transfer_reference' => 'FT'.random_int(100000, 999999)]);

        $payout = $merchant->payoutRequests()->create(['user_id' => $owner->id, 'amount' => 150000, 'iban' => $merchant->iban, 'bank_name' => $merchant->bank_name, 'account_holder' => $merchant->account_holder, 'status' => PayoutStatus::Approved, 'transfer_reference' => 'TRX'.random_int(10000, 99999), 'reviewed_at' => now()->subDays(12)]);
        $wallet->debit($merchant, 150000, WalletTransactionType::Payout, 'طلب تحويل بنكي إلى '.$merchant->iban, $payout, $owner)->forceFill(['created_at' => now()->subDays(13)])->save();

        $shipment = $merchant->shipments()->where('status', ShipmentStatus::FailedAttempt)->first() ?? $merchant->shipments()->first();
        $ticket = $merchant->tickets()->create(['number' => 'T-'.Str::upper(Str::random(6)), 'user_id' => $owner->id, 'shipment_id' => $shipment->id, 'subject' => 'تأخر توصيل الشحنة '.$shipment->awb, 'category' => TicketCategory::Shipment, 'status' => TicketStatus::Answered, 'last_reply_at' => now()->subHours(3)]);
        $ticket->messages()->create(['user_id' => $owner->id, 'body' => 'العميل يفيد بأن المندوب لم يتواصل معه، نرجو المتابعة مع شركة الشحن.']);
        $ticket->messages()->create(['user_id' => User::query()->where('phone', '+966500000001')->value('id'), 'is_staff' => true, 'body' => 'تم التواصل مع شركة الشحن وجدولة محاولة توصيل جديدة غداً قبل الساعة 1 ظهراً.']);
    }
}
