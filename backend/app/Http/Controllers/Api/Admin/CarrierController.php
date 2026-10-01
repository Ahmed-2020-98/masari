<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\Zone;
use App\Http\Controllers\Controller;
use App\Http\Resources\CarrierResource;
use App\Models\Carrier;
use App\Models\CarrierService;
use App\Support\Activity;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class CarrierController extends Controller
{
    /**
     * Carriers with services and rate tables.
     */
    public function index(): AnonymousResourceCollection
    {
        return CarrierResource::collection(Carrier::query()->with('services.rates')->withCount('shipments')->orderBy('sort')->get())
            ->additional(['zones' => Zone::options()]);
    }

    /**
     * Add a carrier.
     */
    public function store(Request $request): JsonResponse
    {
        $carrier = Carrier::create($this->validated($request));
        Activity::log('admin.carrier_created', $carrier);

        return CarrierResource::make($carrier)->response()->setStatusCode(201);
    }

    /**
     * Update a carrier.
     */
    public function update(Request $request, Carrier $carrier): CarrierResource
    {
        $carrier->update($this->validated($request, $carrier));
        Activity::log('admin.carrier_updated', $carrier, $carrier->getChanges());

        return CarrierResource::make($carrier->load('services.rates'));
    }

    /**
     * Add or update a service with its full rate table.
     */
    public function saveService(Request $request, Carrier $carrier): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'integer'],
            'code' => ['required', 'string', 'max:30'],
            'name_ar' => ['required', 'string', 'max:120'],
            'eta_min_days' => ['required', 'integer', 'min:0', 'max:30'],
            'eta_max_days' => ['required', 'integer', 'gte:eta_min_days', 'max:30'],
            'max_weight_kg' => ['required', 'numeric', 'min:1', 'max:1000'],
            'is_active' => ['boolean'],
            'rates' => ['required', 'array'],
            'rates.*.zone' => ['required', new Enum(Zone::class)],
            'rates.*.base_weight_kg' => ['required', 'numeric', 'min:0.5'],
            'rates.*.base_price' => ['required', 'numeric', 'min:0'],
            'rates.*.extra_kg_price' => ['required', 'numeric', 'min:0'],
        ]);

        $service = DB::transaction(function () use ($carrier, $data): CarrierService {
            $service = $carrier->services()->updateOrCreate(
                ['id' => $data['id'] ?? null],
                collect($data)->only(['code', 'name_ar', 'eta_min_days', 'eta_max_days', 'max_weight_kg', 'is_active'])->all(),
            );

            foreach ($data['rates'] as $rate) {
                $service->rates()->updateOrCreate(['zone' => $rate['zone']], [
                    'base_weight_kg' => $rate['base_weight_kg'],
                    'base_price' => Money::toHalalas($rate['base_price']),
                    'extra_kg_price' => Money::toHalalas($rate['extra_kg_price']),
                ]);
            }

            return $service;
        });

        Activity::log('admin.carrier_service_saved', $service, ['carrier' => $carrier->code]);

        return response()->json(['id' => $service->id], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Carrier $carrier = null): array
    {
        return $request->validate([
            'code' => ['required', 'alpha_dash', 'max:30', Rule::unique('carriers', 'code')->ignore($carrier?->id)],
            'name_ar' => ['required', 'string', 'max:120'],
            'name_en' => ['required', 'string', 'max:120'],
            'logo' => ['nullable', 'string', 'max:255'],
            'brand_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'driver' => ['required', Rule::in(['mock'])],
            'supports_cod' => ['boolean'],
            'supports_pickup' => ['boolean'],
            'supports_returns' => ['boolean'],
            'is_active' => ['boolean'],
            'sort' => ['nullable', 'integer'],
        ]);
    }
}
