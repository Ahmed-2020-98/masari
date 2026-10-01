<?php

namespace App\Services\Integrations;

use App\Models\Shipment;
use App\Models\StoreConnection;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SallaIntegration implements StoreIntegration
{
    /**
     * @param  array<string, string|null>  $config
     */
    public function __construct(private array $config, private CityResolver $cities) {}

    public function authorizeUrl(string $state): string
    {
        return $this->config['authorize_url'].'?'.http_build_query([
            'client_id' => $this->config['client_id'],
            'response_type' => 'code',
            'redirect_uri' => route('integrations.callback', 'salla'),
            'scope' => 'offline_access',
            'state' => $state,
        ]);
    }

    public function exchangeCode(string $code): array
    {
        $tokens = Http::asForm()->timeout(15)->post($this->config['token_url'], [
            'grant_type' => 'authorization_code',
            'client_id' => $this->config['client_id'],
            'client_secret' => $this->config['client_secret'],
            'redirect_uri' => route('integrations.callback', 'salla'),
            'code' => $code,
        ])->throw()->json();

        $store = Http::withToken($tokens['access_token'])->timeout(15)->get('https://accounts.salla.sa/oauth2/user/info')->throw()->json('data.merchant');

        return [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?? null,
            'expires_in' => $tokens['expires_in'] ?? null,
            'store_id' => (string) $store['id'],
            'store_name' => $store['name'] ?? null,
            'store_url' => $store['domain'] ?? null,
        ];
    }

    public function verifyWebhook(Request $request, ?StoreConnection $connection): bool
    {
        $secret = $this->config['webhook_secret'];
        $signature = (string) $request->header('X-Salla-Signature');

        return $secret && $signature && hash_equals(hash_hmac('sha256', $request->getContent(), $secret), $signature);
    }

    public function storeIdFromWebhook(Request $request): ?string
    {
        $merchant = $request->input('merchant');

        return $merchant !== null ? (string) $merchant : null;
    }

    public function parseOrder(Request $request): ?array
    {
        if (! in_array($request->input('event'), ['order.created', 'order.updated'], true)) {
            return null;
        }

        $order = $request->input('data', []);
        $customer = data_get($order, 'customer', []);
        $address = data_get($order, 'shipping.address', data_get($order, 'ship_to', []));
        $isCod = data_get($order, 'payment_method') === 'cod';
        $total = Money::toHalalas(data_get($order, 'amounts.total.amount', 0));
        $city = $this->cities->guess(data_get($address, 'city') ?? data_get($customer, 'city'));

        return [
            'external_id' => (string) data_get($order, 'id'),
            'number' => (string) data_get($order, 'reference_id', data_get($order, 'id')),
            'customer' => [
                'name' => trim(data_get($customer, 'first_name', '').' '.data_get($customer, 'last_name', '')) ?: data_get($address, 'name', 'عميل'),
                'phone' => '+'.data_get($customer, 'mobile_code', '966').ltrim((string) data_get($customer, 'mobile', ''), '0'),
                'email' => data_get($customer, 'email'),
                'city_id' => $city?->id,
                'city_name' => data_get($address, 'city'),
                'district' => data_get($address, 'district'),
                'street' => data_get($address, 'street_number', data_get($address, 'shipping_address')),
                'short_address' => data_get($address, 'short_address'),
                'postal_code' => data_get($address, 'postal_code'),
            ],
            'items' => collect(data_get($order, 'items', []))->map(fn (array $item): array => [
                'name' => $item['name'] ?? '',
                'quantity' => (int) ($item['quantity'] ?? 1),
                'sku' => $item['sku'] ?? null,
            ])->values()->all(),
            'total' => $total,
            'payment_method' => data_get($order, 'payment_method'),
            'cod_amount' => $isCod ? $total : 0,
            'weight_kg' => (float) max(0.5, data_get($order, 'shipping.weight', data_get($order, 'total_weight', 1))),
            'ordered_at' => data_get($order, 'date.date'),
        ];
    }

    public function pushTracking(StoreConnection $connection, string $externalOrderId, Shipment $shipment): void
    {
        Http::withToken((string) $connection->access_token)->timeout(15)
            ->put($this->config['api_url']."/orders/{$externalOrderId}/status", [
                'slug' => 'delivering',
                'note' => "رقم التتبع: {$shipment->awb} — {$shipment->carrier->name_ar}",
            ]);
    }
}
