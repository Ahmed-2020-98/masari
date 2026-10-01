<?php

namespace App\Services\Integrations;

use App\Models\Shipment;
use App\Models\StoreConnection;
use Illuminate\Http\Request;

interface StoreIntegration
{
    /**
     * URL the merchant visits to grant access.
     */
    public function authorizeUrl(string $state): string;

    /**
     * Exchange an OAuth code for tokens and store details.
     *
     * @return array{access_token: string, refresh_token: string|null, expires_in: int|null, store_id: string, store_name: string|null, store_url: string|null}
     */
    public function exchangeCode(string $code): array;

    /**
     * Whether the webhook request is authentic.
     */
    public function verifyWebhook(Request $request, ?StoreConnection $connection): bool;

    /**
     * The store identifier carried by a webhook payload.
     */
    public function storeIdFromWebhook(Request $request): ?string;

    /**
     * Normalize an order payload into Masari's structure, or null for irrelevant events.
     *
     * @return array{external_id: string, number: string, customer: array<string, mixed>, items: list<array<string, mixed>>, total: int, payment_method: string|null, cod_amount: int, weight_kg: float, ordered_at: string|null}|null
     */
    public function parseOrder(Request $request): ?array;

    /**
     * Report the AWB and tracking link back to the store order.
     */
    public function pushTracking(StoreConnection $connection, string $externalOrderId, Shipment $shipment): void;
}
