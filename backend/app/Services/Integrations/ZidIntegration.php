<?php

namespace App\Services\Integrations;

use App\Models\Shipment;
use App\Models\StoreConnection;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ZidIntegration implements StoreIntegration
{
    /**
     * @param  array<string, string|null>  $config
     */
    public function __construct(private array $config, private CityResolver $cities) {}

    public function authorizeUrl(string $state): string
    {
        return $this->config['authorize_url'].'?'.http_build_query([
            'client_id' => $this->config['client_id'],
            'redirect_uri' => route('integrations.callback', 'zid'),
            'response_type' => 'code',
            'state' => $state,
        ]);
    }

    public function exchangeCode(string $code): array
    {
        $tokens = Http::asForm()->timeout(15)->post($this->config['token_url'], [
            'grant_type' => 'authorization_code',
            'client_id' => $this->config['client_id'],
            'client_secret' => $this->config['client_secret'],
            'redirect_uri' => route('integrations.callback', 'zid'),
            'code' => $code,
        ])->throw()->json();

        $store = Http::withToken($tokens['authorization'] ?? $tokens['access_token'])
            ->withHeaders(['X-Manager-Token' => $tokens['access_token']])
            ->timeout(15)->get($this->config['api_url'].'/managers/account/profile')->throw()->json('user.store');

        return [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?? null,
            'expires_in' => $tokens['expires_in'] ?? null,
            'store_id' => (string) $store['id'],
            'store_name' => $store['title'] ?? null,
            'store_url' => $store['url'] ?? null,
        ];
    }

    /**
     * Zid webhooks are registered with a per-connection secret token in the URL.
     */
    public function verifyWebhook(Request $request, ?StoreConnection $connection): bool
    {
        $expected = $connection?->settings['webhook_token'] ?? null;

        return $expected && hash_equals($expected, (string) $request->query('token'));
    }

    public function storeIdFromWebhook(Request $request): ?string
    {
        $storeId = $request->input('store_id');

        return $storeId !== null ? (string) $storeId : null;
    }

    public function parseOrder(Request $request): ?array
    {
        $order = $request->all();

        if (! data_get($order, 'id') || ! data_get($order, 'customer')) {
            return null;
        }

        $address = data_get($order, 'shipping.address', []);
        $isCod = str_contains((string) data_get($order, 'payment.method.code'), 'cod');
        $total = Money::toHalalas(data_get($order, 'order_total', 0));
        $city = $this->cities->guess(data_get($address, 'city.name'));

        return [
            'external_id' => (string) data_get($order, 'id'),
            'number' => (string) data_get($order, 'code', data_get($order, 'id')),
            'customer' => [
                'name' => data_get($order, 'customer.name', 'عميل'),
                'phone' => (string) data_get($order, 'customer.mobile'),
                'email' => data_get($order, 'customer.email'),
                'city_id' => $city?->id,
                'city_name' => data_get($address, 'city.name'),
                'district' => data_get($address, 'district'),
                'street' => data_get($address, 'street'),
                'short_address' => data_get($address, 'short_address'),
                'postal_code' => null,
            ],
            'items' => collect(data_get($order, 'products', []))->map(fn (array $item): array => [
                'name' => $item['name'] ?? '',
                'quantity' => (int) ($item['quantity'] ?? 1),
                'sku' => $item['sku'] ?? null,
            ])->values()->all(),
            'total' => $total,
            'payment_method' => data_get($order, 'payment.method.code'),
            'cod_amount' => $isCod ? $total : 0,
            'weight_kg' => (float) max(0.5, data_get($order, 'weight', 1)),
            'ordered_at' => data_get($order, 'created_at'),
        ];
    }

    public function pushTracking(StoreConnection $connection, string $externalOrderId, Shipment $shipment): void
    {
        Http::withToken((string) $connection->access_token)
            ->withHeaders(['X-Manager-Token' => (string) $connection->access_token])
            ->timeout(15)
            ->asForm()
            ->post($this->config['api_url']."/managers/store/orders/{$externalOrderId}/change-order-status", [
                'order_status' => 'indelivery',
                'tracking_number' => $shipment->awb,
                'tracking_url' => rtrim(config('masari.web_url'), '/').'/track/'.$shipment->awb,
            ]);
    }
}
