<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Shipments\ApplyTrackingEventsAction;
use App\Enums\ShipmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ShipmentResource;
use App\Models\Shipment;
use App\Services\Carriers\CarrierManager;
use App\Services\Carriers\Data\TrackingEvent;
use App\Support\Activity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rules\Enum;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ShipmentController extends Controller
{
    /**
     * All shipments across merchants.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $shipments = QueryBuilder::for(Shipment::class)
            ->with(['carrier', 'carrierService', 'merchant'])
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::exact('carrier_id'),
                AllowedFilter::exact('merchant_id'),
                AllowedFilter::exact('cod_status'),
                AllowedFilter::exact('source'),
                AllowedFilter::callback('date_from', fn (Builder $query, $value) => $query->whereDate('created_at', '>=', $value)),
                AllowedFilter::callback('date_to', fn (Builder $query, $value) => $query->whereDate('created_at', '<=', $value)),
                AllowedFilter::callback('search', fn (Builder $query, $value) => $query->where(fn (Builder $inner) => $inner
                    ->where('awb', 'like', "%{$value}%")
                    ->orWhere('reference', 'like', "%{$value}%")
                    ->orWhere('recipient->phone', 'like', "%{$value}%"))),
            )
            ->defaultSort('-id')
            ->paginate(min((int) $request->integer('per_page', 25), 100))
            ->withQueryString();

        return ShipmentResource::collection($shipments);
    }

    /**
     * Shipment details.
     */
    public function show(Shipment $shipment): ShipmentResource
    {
        return ShipmentResource::make($shipment->load(['carrier', 'carrierService', 'events', 'merchant', 'parent']));
    }

    /**
     * Force a status (manual correction from carrier portal / call center).
     */
    public function updateStatus(Request $request, Shipment $shipment, ApplyTrackingEventsAction $apply): ShipmentResource
    {
        $data = $request->validate([
            'status' => ['required', new Enum(ShipmentStatus::class)],
            'description' => ['nullable', 'string', 'max:190'],
            'location' => ['nullable', 'string', 'max:120'],
        ]);

        $status = ShipmentStatus::from($data['status']);
        $apply->handle($shipment, [new TrackingEvent($status, $data['description'] ?: $status->label(), now(), $data['location'] ?? null, ['manual' => $request->user()->id])]);
        Activity::log('admin.shipment_status_forced', $shipment, $data);

        return ShipmentResource::make($shipment->load(['carrier', 'events', 'merchant']));
    }

    /**
     * Pull tracking from the carrier now.
     */
    public function sync(Shipment $shipment, CarrierManager $carriers, ApplyTrackingEventsAction $apply): ShipmentResource
    {
        $apply->handle($shipment, $carriers->for($shipment->carrier)->track($shipment));

        return ShipmentResource::make($shipment->load(['carrier', 'events', 'merchant']));
    }
}
