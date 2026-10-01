<?php

namespace Tests\Feature\Http\Controllers\Api\Webhooks;

use App\Enums\StorePlatform;
use App\Models\StoreConnection;
use App\Models\StoreOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    private StoreConnection $connection;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        [, $merchant] = $this->merchantWithOwner();
        $this->connection = StoreConnection::create(['merchant_id' => $merchant->id, 'platform' => StorePlatform::Salla, 'store_id' => '12345', 'status' => 'active']);
    }

    /**
     * @return array<string, mixed>
     */
    private function sallaOrder(): array
    {
        return [
            'event' => 'order.created',
            'merchant' => 12345,
            'data' => [
                'id' => 998877,
                'reference_id' => 'S-1001',
                'payment_method' => 'cod',
                'amounts' => ['total' => ['amount' => 245.5]],
                'customer' => ['first_name' => 'رهف', 'last_name' => 'الحربي', 'mobile' => '551234567', 'mobile_code' => '966'],
                'shipping' => ['address' => ['city' => 'جده', 'district' => 'الروضة']],
                'items' => [['name' => 'عطر', 'quantity' => 2]],
            ],
        ];
    }

    public function test_signed_salla_order_is_imported_with_cod_and_matched_city(): void
    {
        $body = json_encode($this->sallaOrder());

        $this->call('POST', '/api/v1/webhooks/stores/salla', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_SALLA_SIGNATURE' => hash_hmac('sha256', $body, 'salla-test-secret'),
        ], $body)->assertOk();

        $order = StoreOrder::query()->firstOrFail();
        $this->assertSame('S-1001', $order->number);
        $this->assertSame(24550, $order->cod_amount);
        $this->assertSame('+966551234567', $order->customer['phone']);
        $this->assertSame($this->cityId('Jeddah'), $order->customer['city_id']);
    }

    public function test_salla_webhook_with_bad_signature_returns_401(): void
    {
        $this->postJson('/api/v1/webhooks/stores/salla', $this->sallaOrder(), ['X-Salla-Signature' => 'forged'])->assertUnauthorized();

        $this->assertSame(0, StoreOrder::query()->count());
    }
}
