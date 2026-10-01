<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Actions\Pickups\SchedulePickupAction;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PickupResource;
use App\Models\Carrier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PickupController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Scheduled pickups.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return PickupResource::collection($this->merchant($request)->pickups()->with('carrier')->latest('pickup_date')->latest('id')->paginate(20));
    }

    /**
     * Book a carrier pickup.
     */
    public function store(Request $request, SchedulePickupAction $schedule): JsonResponse
    {
        $data = $request->validate([
            'carrier_id' => ['required', 'exists:carriers,id'],
            'address_id' => ['required', 'integer'],
            'pickup_date' => ['required', 'date', 'after_or_equal:today', 'before:+14 days'],
            'time_slot' => ['required', Rule::in(['09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00'])],
            'shipment_ids' => ['required', 'array', 'min:1'],
            'shipment_ids.*' => ['string'],
            'notes' => ['nullable', 'string', 'max:300'],
        ]);

        $merchant = $this->merchant($request);
        $address = $merchant->addresses()->where('type', 'sender')->findOrFail($data['address_id']);
        $ids = $merchant->shipments()->whereIn('uuid', $data['shipment_ids'])->pluck('id')->all();

        $pickup = $schedule->handle($merchant, Carrier::query()->findOrFail($data['carrier_id']), $address, $data['pickup_date'], $data['time_slot'], $ids, $data['notes'] ?? null);

        return PickupResource::make($pickup->load('carrier'))->response()->setStatusCode(201);
    }
}
