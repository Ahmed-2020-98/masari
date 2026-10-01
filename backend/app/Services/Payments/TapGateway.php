<?php

namespace App\Services\Payments;

use App\Models\Topup;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class TapGateway implements PaymentGateway
{
    /**
     * @param  array{secret_key: string|null, base_url: string, merchant_id: string|null}  $config
     */
    public function __construct(private array $config) {}

    /**
     * Create a Tap charge (card, mada, Apple Pay via src_all) and return its hosted transaction URL.
     */
    public function createCharge(Topup $topup, string $redirectUrl): string
    {
        $user = $topup->user;

        $response = $this->client()->post('/charges', [
            'amount' => round($topup->amount / 100, 2),
            'currency' => 'SAR',
            'customer_initiated' => true,
            'threeDSecure' => true,
            'save_card' => false,
            'description' => 'شحن رصيد محفظة مساري',
            'metadata' => ['topup_id' => $topup->id, 'merchant_id' => $topup->merchant_id],
            'reference' => ['transaction' => 'TOPUP-'.$topup->id, 'order' => 'TOPUP-'.$topup->id],
            'receipt' => ['email' => false, 'sms' => true],
            'customer' => [
                'first_name' => $user?->name ?? 'Masari',
                'phone' => ['country_code' => '966', 'number' => substr((string) $user?->phone, 4)],
            ],
            'merchant' => ['id' => $this->config['merchant_id']],
            'source' => ['id' => 'src_all'],
            'post' => ['url' => route('webhooks.tap')],
            'redirect' => ['url' => $redirectUrl],
        ])->throw()->json();

        $topup->update(['gateway_reference' => $response['id'], 'meta' => ['tap_status' => $response['status'] ?? null]]);

        return $response['transaction']['url'];
    }

    /**
     * Map Tap's charge status onto our simplified states.
     */
    public function status(string $chargeId): string
    {
        $status = $this->client()->get("/charges/{$chargeId}")->throw()->json('status');

        return match ($status) {
            'CAPTURED' => 'paid',
            'INITIATED', 'IN_PROGRESS' => 'pending',
            default => 'failed',
        };
    }

    /**
     * Authenticated HTTP client for the Tap API.
     */
    private function client(): PendingRequest
    {
        return Http::baseUrl($this->config['base_url'])
            ->withToken((string) $this->config['secret_key'])
            ->acceptJson()
            ->timeout(15);
    }
}
