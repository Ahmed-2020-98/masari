<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Actions\Integrations\ImportStoreOrderAction;
use App\Enums\StorePlatform;
use App\Http\Controllers\Controller;
use App\Models\StoreConnection;
use App\Services\Integrations\IntegrationManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreWebhookController extends Controller
{
    /**
     * Receive order events from Salla or Zid.
     */
    public function __invoke(Request $request, string $platform, IntegrationManager $integrations, ImportStoreOrderAction $import): JsonResponse
    {
        $platform = StorePlatform::tryFrom($platform) ?? abort(404);
        $integration = $integrations->for($platform);
        $storeId = $integration->storeIdFromWebhook($request);

        $connection = $storeId
            ? StoreConnection::query()->where('platform', $platform)->where('store_id', $storeId)->where('status', 'active')->first()
            : null;

        abort_unless($integration->verifyWebhook($request, $connection), 401);

        if (! $connection) {
            return response()->json(['ignored' => 'unknown_store']);
        }

        $order = $integration->parseOrder($request);

        if ($order) {
            $import->handle($connection, $order);
        }

        return response()->json(['received' => true]);
    }
}
