<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Actions\Shipments\CancelShipmentAction;
use App\Actions\Shipments\CreateReturnShipmentAction;
use App\Actions\Shipments\CreateShipmentAction;
use App\Enums\ShipmentStatus;
use App\Enums\StoreOrderStatus;
use App\Exports\ShipmentsExport;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShipmentRequest;
use App\Http\Resources\ShipmentResource;
use App\Models\Shipment;
use App\Services\Integrations\IntegrationManager;
use App\Services\Labels\LabelService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ShipmentController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Filterable, paginated shipments list.
     *
     * Filters: status, carrier_id, cod (1), type, source, date_from, date_to, search (AWB, reference, phone, name, order number).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $shipments = $this->query($request)
            ->with(['carrier', 'carrierService'])
            ->paginate(min((int) $request->integer('per_page', 20), 100))
            ->withQueryString();

        return ShipmentResource::collection($shipments)->additional([
            'counts' => $this->merchant($request)->shipments()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status'),
        ]);
    }

    /**
     * Create and pay for a shipment.
     */
    public function store(StoreShipmentRequest $request, CreateShipmentAction $create, IntegrationManager $integrations): JsonResponse
    {
        $merchant = $this->merchant($request);
        $data = $request->validated();

        if (! empty($data['sender_address_id'])) {
            $data['sender'] = $merchant->addresses()->findOrFail($data['sender_address_id'])->toArray();
        }

        $storeOrder = ! empty($data['store_order_id'])
            ? $merchant->storeOrders()->where('status', StoreOrderStatus::Pending)->findOrFail($data['store_order_id'])
            : null;

        $shipment = $create->handle($merchant, $data + ['source' => $storeOrder ? $storeOrder->storeConnection->platform->value : 'manual'], $request->user());

        if ($request->boolean('save_recipient')) {
            $merchant->addresses()->firstOrCreate(
                ['type' => 'recipient', 'phone' => $data['recipient']['phone']],
                collect($data['recipient'])->only(['name', 'email', 'city_id', 'district', 'street', 'building_no', 'postal_code', 'short_address'])->all(),
            );
        }

        if ($storeOrder) {
            $storeOrder->update(['status' => StoreOrderStatus::Shipped, 'shipment_id' => $shipment->id]);
            rescue(fn () => $integrations->for($storeOrder->storeConnection->platform)->pushTracking($storeOrder->storeConnection, $storeOrder->external_id, $shipment), report: true);
        }

        return ShipmentResource::make($shipment->load(['carrier', 'carrierService', 'events']))->response()->setStatusCode(201);
    }

    /**
     * Shipment details with its tracking timeline.
     */
    public function show(Request $request, Shipment $shipment): ShipmentResource
    {
        $this->ensureOwned($request, $shipment);

        return ShipmentResource::make($shipment->load(['carrier', 'carrierService', 'events', 'parent']));
    }

    /**
     * Cancel the shipment and refund the wallet.
     */
    public function cancel(Request $request, Shipment $shipment, CancelShipmentAction $cancel): ShipmentResource
    {
        $this->ensureOwned($request, $shipment);

        return ShipmentResource::make($cancel->handle($shipment, $request->user())->load(['carrier', 'events']));
    }

    /**
     * Cancel several shipments; returns per-shipment results.
     */
    public function bulkCancel(Request $request, CancelShipmentAction $cancel): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'max:100'], 'ids.*' => ['string']]);
        $results = [];

        foreach ($this->merchant($request)->shipments()->whereIn('uuid', $data['ids'])->get() as $shipment) {
            try {
                $cancel->handle($shipment, $request->user());
                $results[] = ['id' => $shipment->uuid, 'ok' => true];
            } catch (Throwable $exception) {
                $results[] = ['id' => $shipment->uuid, 'ok' => false, 'message' => $exception->getMessage()];
            }
        }

        return response()->json(['data' => $results]);
    }

    /**
     * Create a return shipment for a delivered shipment.
     */
    public function createReturn(Request $request, Shipment $shipment, CreateReturnShipmentAction $createReturn): JsonResponse
    {
        $this->ensureOwned($request, $shipment);
        $data = $request->validate([
            'carrier_service_id' => ['nullable', 'integer', 'exists:carrier_services,id'],
            'reason' => ['nullable', 'string', 'max:300'],
        ]);

        $return = $createReturn->handle($shipment, $request->user(), $data['carrier_service_id'] ?? null, $data['reason'] ?? null);

        return ShipmentResource::make($return->load(['carrier', 'carrierService', 'events']))->response()->setStatusCode(201);
    }

    /**
     * Download the label PDF.
     */
    public function label(Request $request, Shipment $shipment, LabelService $labels): Response
    {
        $this->ensureOwned($request, $shipment);
        abort_if($shipment->status === ShipmentStatus::Cancelled || ! $shipment->awb, 404);

        if (! $shipment->label_path || ! Storage::disk('local')->exists($shipment->label_path)) {
            $shipment->update(['label_path' => $labels->generate($shipment)]);
        }

        return Storage::disk('local')->response($shipment->label_path, "label-{$shipment->awb}.pdf", ['Content-Type' => 'application/pdf']);
    }

    /**
     * Merge labels of several shipments into one PDF.
     */
    public function labels(Request $request, LabelService $labels): Response
    {
        $data = $request->validate(['ids' => ['required', 'array', 'max:100'], 'ids.*' => ['string']]);
        $shipments = $this->merchant($request)->shipments()->whereIn('uuid', $data['ids'])->whereNotNull('awb')->get();

        return response($labels->merge($shipments), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="labels.pdf"',
        ]);
    }

    /**
     * Export the filtered shipments to Excel.
     */
    public function export(Request $request): BinaryFileResponse
    {
        return Excel::download(new ShipmentsExport($this->query($request)->with(['carrier', 'carrierService'])->getEloquentBuilder()), 'shipments-'.now()->format('Y-m-d').'.xlsx');
    }

    /**
     * Shared filtered query for listing and export.
     *
     * @return QueryBuilder<Shipment>
     */
    private function query(Request $request): QueryBuilder
    {
        return QueryBuilder::for($this->merchant($request)->shipments()->getQuery())
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::exact('carrier_id'),
                AllowedFilter::exact('type'),
                AllowedFilter::exact('source'),
                AllowedFilter::exact('cod_status'),
                AllowedFilter::callback('cod', fn (Builder $query, $value) => $value ? $query->where('cod_amount', '>', 0) : $query->where('cod_amount', 0)),
                AllowedFilter::callback('in_transit', fn (Builder $query) => $query->whereIn('status', ShipmentStatus::inTransitGroup())),
                AllowedFilter::callback('date_from', fn (Builder $query, $value) => $query->whereDate('created_at', '>=', $value)),
                AllowedFilter::callback('date_to', fn (Builder $query, $value) => $query->whereDate('created_at', '<=', $value)),
                AllowedFilter::callback('city_id', fn (Builder $query, $value) => $query->where('destination_city_id', $value)),
                AllowedFilter::callback('search', function (Builder $query, $value): void {
                    $term = trim((string) $value);
                    $query->where(fn (Builder $inner) => $inner
                        ->where('awb', 'like', "%{$term}%")
                        ->orWhere('reference', 'like', "%{$term}%")
                        ->orWhere('order_number', 'like', "%{$term}%")
                        ->orWhere('recipient->phone', 'like', "%{$term}%")
                        ->orWhere('recipient->name', 'like', "%{$term}%"));
                }),
            )
            ->allowedSorts('created_at', 'total', 'status')
            ->defaultSort('-created_at', '-id');
    }
}
