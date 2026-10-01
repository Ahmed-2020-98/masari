<?php

namespace App\Http\Controllers\Api\Public;

use App\Enums\ShipmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CarrierResource;
use App\Http\Resources\CityResource;
use App\Http\Resources\PlanResource;
use App\Http\Resources\ShipmentEventResource;
use App\Models\Carrier;
use App\Models\City;
use App\Models\Plan;
use App\Models\Region;
use App\Models\Shipment;
use App\Services\Pricing\PricingService;
use App\Services\Pricing\Quote;
use App\Support\Activity;
use App\Support\Money;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class PublicController extends Controller
{
    /**
     * Saudi regions with their active cities.
     */
    public function cities(): JsonResponse
    {
        $regions = Region::query()->with(['cities' => fn ($query) => $query->where('is_active', true)->orderBy('name_ar')])->orderBy('id')->get();

        return response()->json([
            'data' => $regions->map(fn (Region $region) => [
                'id' => $region->id,
                'name' => $region->name_ar,
                'cities' => CityResource::collection($region->cities),
            ]),
        ]);
    }

    /**
     * Active carriers shown on the landing page and in filters.
     */
    public function carriers(): AnonymousResourceCollection
    {
        return CarrierResource::collection(Carrier::query()->where('is_active', true)->orderBy('sort')->get());
    }

    /**
     * Public shipping calculator using the default plan.
     */
    public function quote(Request $request, PricingService $pricing): JsonResponse
    {
        $data = $request->validate([
            'origin_city_id' => ['required', 'exists:cities,id'],
            'destination_city_id' => ['required', 'exists:cities,id'],
            'weight_kg' => ['required', 'numeric', 'min:0.1', 'max:70'],
            'cod' => ['boolean'],
        ]);

        $quotes = $pricing->quotes(
            null,
            City::query()->findOrFail($data['origin_city_id']),
            City::query()->findOrFail($data['destination_city_id']),
            (float) $data['weight_kg'],
            null,
            ($data['cod'] ?? false) ? 100 : 0,
        );

        return response()->json(['data' => $quotes->map(fn (Quote $quote) => $quote->toArray())->values()]);
    }

    /**
     * Public tracking timeline by AWB or reference (no personal data beyond first name and city).
     */
    public function track(string $awb): JsonResponse
    {
        $shipment = Shipment::query()
            ->with(['carrier', 'events', 'originCity', 'destinationCity', 'merchant'])
            ->where('awb', $awb)
            ->orWhere('reference', $awb)
            ->first();

        if (! $shipment || $shipment->status === ShipmentStatus::Draft) {
            return response()->json(['message' => 'لم نعثر على شحنة بهذا الرقم، تأكد من رقم التتبع.', 'code' => 'not_found', 'errors' => (object) []], 404);
        }

        $flow = [ShipmentStatus::Created, ShipmentStatus::PickedUp, ShipmentStatus::InTransit, ShipmentStatus::OutForDelivery, ShipmentStatus::Delivered];

        return response()->json([
            'awb' => $shipment->awb,
            'reference' => $shipment->reference,
            'status' => $shipment->status->present(),
            'carrier' => CarrierResource::make($shipment->carrier),
            'store_name' => $shipment->merchant->store_name,
            'origin' => $shipment->originCity->name_ar,
            'destination' => $shipment->destinationCity->name_ar,
            'recipient_name' => Str::before($shipment->recipient['name'], ' '),
            'cod' => $shipment->isCod() ? Money::present($shipment->cod_amount) : null,
            'steps' => collect($flow)->map(fn (ShipmentStatus $status) => [
                ...$status->present(),
                'reached' => $shipment->events->contains('status', $status),
            ]),
            'events' => ShipmentEventResource::collection($shipment->events),
            'delivered_at' => $shipment->delivered_at?->toIso8601String(),
            'created_at' => $shipment->created_at->toIso8601String(),
        ]);
    }

    /**
     * Landing page content managed from the admin panel.
     */
    public function content(): JsonResponse
    {
        return response()->json([
            'plans' => PlanResource::collection(Plan::query()->where('is_active', true)->orderBy('sort')->get()),
            'faqs' => Settings::get('landing.faqs', []),
            'stats' => Settings::get('landing.stats', []),
            'contact' => Settings::get('landing.contact', []),
        ]);
    }

    /**
     * Contact form submission.
     */
    public function contact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'subject' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:3000'],
        ]);

        Activity::log('contact.submitted', null, $data);

        return response()->json(['message' => 'شكراً لتواصلك معنا، سيتواصل معك فريقنا قريباً.'], 201);
    }
}
