<?php

namespace App\Services\Webhooks;

use App\Jobs\SendWebhookJob;
use App\Models\Merchant;
use App\Models\WebhookEndpoint;

class WebhookDispatcher
{
    /**
     * Events merchants can subscribe to.
     *
     * @var list<string>
     */
    public const EVENTS = [
        'shipment.created',
        'shipment.status_changed',
        'shipment.delivered',
        'shipment.returned',
        'shipment.cancelled',
        'wallet.credited',
    ];

    /**
     * Queue a delivery for every active endpoint subscribed to the event.
     *
     * @param  array<string, mixed>  $data
     */
    public function dispatch(Merchant $merchant, string $event, array $data): void
    {
        $endpoints = WebhookEndpoint::query()
            ->where('merchant_id', $merchant->id)
            ->where('is_active', true)
            ->get()
            ->filter(fn (WebhookEndpoint $endpoint): bool => in_array($event, $endpoint->events, true) || in_array('*', $endpoint->events, true));

        foreach ($endpoints as $endpoint) {
            $delivery = $endpoint->deliveries()->create([
                'event' => $event,
                'payload' => [
                    'event' => $event,
                    'created_at' => now()->toIso8601String(),
                    'data' => $data,
                ],
            ]);

            SendWebhookJob::dispatch($delivery);
        }
    }
}
