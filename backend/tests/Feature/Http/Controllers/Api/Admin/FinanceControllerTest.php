<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\CodStatus;
use App\Enums\PayoutStatus;
use App\Enums\ShipmentStatus;
use App\Enums\TopupStatus;
use App\Models\Carrier;
use App\Models\PayoutRequest;
use App\Models\Shipment;
use App\Models\Topup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $finance;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        $this->finance = User::factory()->admin()->create();
        $this->finance->assignRole('finance');
    }

    public function test_approving_bank_topup_credits_wallet_exactly_once(): void
    {
        [, $merchant] = $this->merchantWithOwner(0);
        $topup = Topup::factory()->create(['merchant_id' => $merchant->id, 'amount' => 50000]);
        Sanctum::actingAs($this->finance);

        $this->postJson("/api/v1/admin/topups/{$topup->id}/approve")->assertOk()->assertJsonPath('data.status.value', 'paid');
        $this->postJson("/api/v1/admin/topups/{$topup->id}/approve")->assertOk();

        $this->assertSame(50000, $merchant->wallet->fresh()->balance);
        $this->assertSame(1, $merchant->wallet->transactions()->count());
    }

    public function test_settling_cod_returns_201_credits_merchant_and_skips_uncollected(): void
    {
        [, $merchant] = $this->merchantWithOwner(0);
        $carrier = Carrier::query()->where('code', 'smsa')->first();
        $collected = Shipment::factory()->create(['merchant_id' => $merchant->id, 'carrier_id' => $carrier->id, 'status' => ShipmentStatus::Delivered, 'cod_amount' => 30000, 'cod_status' => CodStatus::Collected]);
        $pending = Shipment::factory()->create(['merchant_id' => $merchant->id, 'carrier_id' => $carrier->id, 'status' => ShipmentStatus::InTransit, 'cod_amount' => 99000, 'cod_status' => CodStatus::Pending]);
        Sanctum::actingAs($this->finance);

        $this->postJson('/api/v1/admin/cod/settle', ['carrier_id' => $carrier->id, 'awbs' => "{$collected->awb}\n{$pending->awb}", 'reference' => 'REM-1'])
            ->assertCreated()
            ->assertJsonPath('data.shipments_count', 1)
            ->assertJsonPath('data.total_amount.amount', 30000);

        $this->assertSame(CodStatus::Credited, $collected->fresh()->cod_status);
        $this->assertSame(CodStatus::Pending, $pending->fresh()->cod_status);
        $this->assertSame(30000, $merchant->wallet->fresh()->balance);
    }

    public function test_rejecting_payout_returns_held_amount_to_wallet(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner(80000);
        $merchant->update(['iban' => 'SA0380000000608010167519', 'account_holder' => 'مؤسسة']);
        Sanctum::actingAs($owner);
        $payoutId = $this->postJson('/api/v1/merchant/payouts', ['amount' => 500])->assertCreated()->json('data.id');
        $this->assertSame(30000, $merchant->wallet->fresh()->balance);

        Sanctum::actingAs($this->finance);
        $this->postJson("/api/v1/admin/payouts/{$payoutId}/reject", ['reason' => 'بيانات الحساب غير مطابقة'])->assertOk();

        $this->assertSame(PayoutStatus::Rejected, PayoutRequest::query()->find($payoutId)->status);
        $this->assertSame(80000, $merchant->wallet->fresh()->balance);
    }

    public function test_support_admin_cannot_access_finance_and_gets_403(): void
    {
        $support = User::factory()->admin()->create();
        $support->assignRole('support');
        Sanctum::actingAs($support);

        $this->getJson('/api/v1/admin/topups')->assertForbidden();
        $this->getJson('/api/v1/admin/tickets')->assertOk();
    }

    public function test_merchant_user_cannot_access_admin_api_and_gets_403(): void
    {
        [$owner] = $this->merchantWithOwner();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }

    public function test_card_topup_through_fake_gateway_credits_wallet(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner(0);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/merchant/topups/card', ['amount' => 100, 'redirect_url' => 'https://app.masari.test/dashboard/wallet'])->assertCreated();
        $topup = Topup::query()->findOrFail($response->json('topup.id'));

        $page = $this->get($response->json('payment_url'))->assertOk();
        preg_match('/name="signature" value="([a-f0-9]+)"/', $page->getContent(), $matches);

        $this->post(route('payments.fake.complete', $topup), ['outcome' => 'paid', 'signature' => $matches[1], 'redirect' => 'https://app.masari.test/dashboard/wallet'])
            ->assertRedirect('https://app.masari.test/dashboard/wallet?topup='.$topup->id);

        $this->assertSame(TopupStatus::Paid, $topup->fresh()->status);
        $this->assertSame(10000, $merchant->wallet->fresh()->balance);
    }
}
