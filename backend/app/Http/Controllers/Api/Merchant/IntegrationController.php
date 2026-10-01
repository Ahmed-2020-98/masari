<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\StorePlatform;
use App\Exceptions\DomainException;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StoreConnectionResource;
use App\Models\StoreConnection;
use App\Services\Integrations\IntegrationManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rules\Enum;

class IntegrationController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Connected stores.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return StoreConnectionResource::collection($this->merchant($request)->storeConnections()->withCount('orders')->latest('id')->get());
    }

    /**
     * OAuth URL to connect a Salla or Zid store.
     */
    public function connect(Request $request, IntegrationManager $integrations): JsonResponse
    {
        $data = $request->validate(['platform' => ['required', new Enum(StorePlatform::class)]]);
        $platform = StorePlatform::from($data['platform']);

        if (! config("masari.integrations.{$platform->value}.client_id")) {
            throw new DomainException('الربط مع '.$platform->label().' غير مفعّل بعد، يرجى التواصل مع الدعم.', 'integration_unconfigured');
        }

        $state = Crypt::encryptString(json_encode(['merchant_id' => $this->merchant($request)->id, 'ts' => now()->timestamp]));

        return response()->json(['url' => $integrations->for($platform)->authorizeUrl($state)]);
    }

    /**
     * Update auto-ship settings.
     */
    public function update(Request $request, StoreConnection $storeConnection): StoreConnectionResource
    {
        $this->ensureOwned($request, $storeConnection);
        $data = $request->validate([
            'auto_ship' => ['boolean'],
            'carrier_service_id' => ['nullable', 'exists:carrier_services,id'],
            'sender_address_id' => ['nullable', 'integer'],
        ]);

        if (! empty($data['sender_address_id'])) {
            $this->merchant($request)->addresses()->findOrFail($data['sender_address_id']);
        }

        $storeConnection->update(['settings' => array_merge($storeConnection->settings ?? [], $data)]);

        return StoreConnectionResource::make($storeConnection);
    }

    /**
     * Disconnect a store.
     */
    public function destroy(Request $request, StoreConnection $storeConnection): JsonResponse
    {
        $this->ensureOwned($request, $storeConnection);
        $storeConnection->update(['status' => 'disconnected', 'access_token' => null, 'refresh_token' => null]);

        return response()->json(['message' => 'تم إلغاء ربط المتجر.']);
    }
}
