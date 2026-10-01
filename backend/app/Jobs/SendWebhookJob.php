<?php

namespace App\Jobs;

use App\Models\WebhookDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SendWebhookJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(public WebhookDelivery $delivery) {}

    /**
     * Back off 1, 5, 15, 60 minutes between retries.
     *
     * @return list<int>
     */
    public function backoff(): array
    {
        return [60, 300, 900, 3600];
    }

    /**
     * POST the signed payload to the merchant endpoint.
     */
    public function handle(): void
    {
        $endpoint = $this->delivery->endpoint;
        $body = json_encode($this->delivery->payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $timestamp = (string) now()->timestamp;
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, $endpoint->secret);

        $response = Http::timeout(10)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'X-Masari-Event' => $this->delivery->event,
                'X-Masari-Timestamp' => $timestamp,
                'X-Masari-Signature' => $signature,
                'X-Masari-Delivery' => (string) $this->delivery->id,
            ])
            ->withBody($body)
            ->post($endpoint->url);

        $this->delivery->update([
            'attempts' => $this->delivery->attempts + 1,
            'response_status' => $response->status(),
            'response_body' => Str::limit($response->body(), 2000),
            'delivered_at' => $response->successful() ? now() : null,
        ]);

        $endpoint->update([$response->successful() ? 'last_success_at' : 'last_failure_at' => now()]);

        if ($response->failed()) {
            throw new RuntimeException("Webhook delivery {$this->delivery->id} failed with status {$response->status()}.");
        }
    }
}
