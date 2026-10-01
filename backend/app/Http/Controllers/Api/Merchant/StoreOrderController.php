<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\StoreOrderStatus;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StoreOrderResource;
use App\Models\StoreOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StoreOrderController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Orders imported from connected stores.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $this->merchant($request)->storeOrders()
            ->with(['storeConnection', 'shipment'])
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->query('search'), fn ($query, $term) => $query->where(fn ($inner) => $inner->where('number', 'like', "%{$term}%")->orWhere('customer->name', 'like', "%{$term}%")->orWhere('customer->phone', 'like', "%{$term}%")))
            ->latest('ordered_at')
            ->latest('id')
            ->paginate(20);

        return StoreOrderResource::collection($orders);
    }

    /**
     * A single imported order (used to prefill shipment creation).
     */
    public function show(Request $request, StoreOrder $storeOrder): StoreOrderResource
    {
        $this->ensureOwned($request, $storeOrder);

        return StoreOrderResource::make($storeOrder->load(['storeConnection', 'shipment']));
    }

    /**
     * Update order shipping details (e.g. fix an unmatched city) or ignore it.
     */
    public function update(Request $request, StoreOrder $storeOrder): StoreOrderResource
    {
        $this->ensureOwned($request, $storeOrder);
        $data = $request->validate([
            'status' => ['nullable', 'in:pending,ignored'],
            'customer.city_id' => ['nullable', 'exists:cities,id'],
            'customer.district' => ['nullable', 'string', 'max:120'],
            'customer.street' => ['nullable', 'string', 'max:190'],
            'weight_kg' => ['nullable', 'numeric', 'min:0.1', 'max:70'],
        ]);

        $storeOrder->update(array_filter([
            'status' => isset($data['status']) ? StoreOrderStatus::from($data['status']) : null,
            'customer' => isset($data['customer']) ? array_merge($storeOrder->customer, array_filter($data['customer'])) : null,
            'weight_kg' => $data['weight_kg'] ?? null,
        ], fn ($value) => $value !== null));

        return StoreOrderResource::make($storeOrder->load(['storeConnection', 'shipment']));
    }
}
