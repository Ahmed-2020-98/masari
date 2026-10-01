<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\CodStatus;
use App\Enums\ShipmentStatus;
use App\Enums\StoreOrderStatus;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ShipmentResource;
use App\Support\Money;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use InteractsWithMerchant;

    /**
     * KPIs, 30-day chart, carrier split and latest shipments.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $merchant = $this->merchant($request);
        $shipments = $merchant->shipments();
        $since = now()->subDays(29)->startOfDay();

        $byStatus = (clone $shipments)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $count = fn (ShipmentStatus ...$statuses): int => (int) collect($statuses)->sum(fn (ShipmentStatus $status) => $byStatus[$status->value] ?? 0);

        $daily = (clone $shipments)
            ->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as day, count(*) as total, sum(status = ?) as delivered', [ShipmentStatus::Delivered->value])
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $chart = collect(CarbonPeriod::create($since, now()))->map(fn ($day) => [
            'date' => $day->toDateString(),
            'total' => (int) ($daily[$day->toDateString()]->total ?? 0),
            'delivered' => (int) ($daily[$day->toDateString()]->delivered ?? 0),
        ]);

        $carriers = (clone $shipments)
            ->join('carriers', 'carriers.id', '=', 'shipments.carrier_id')
            ->where('shipments.created_at', '>=', $since)
            ->groupBy('carriers.id', 'carriers.name_ar', 'carriers.brand_color')
            ->select('carriers.name_ar as name', 'carriers.brand_color as color', DB::raw('count(*) as total'))
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'kpis' => [
                'total' => $byStatus->sum(),
                'delivered' => $count(ShipmentStatus::Delivered),
                'in_transit' => $count(...ShipmentStatus::inTransitGroup()),
                'awaiting_pickup' => $count(ShipmentStatus::Created),
                'returned' => $count(ShipmentStatus::Returned),
                'cancelled' => $count(ShipmentStatus::Cancelled),
                'delivery_rate' => ($done = $count(ShipmentStatus::Delivered, ShipmentStatus::Returned)) > 0
                    ? round($count(ShipmentStatus::Delivered) / $done * 100, 1)
                    : null,
                'wallet' => Money::present($merchant->wallet?->balance ?? 0),
                'cod_pending' => Money::present((int) (clone $shipments)->whereIn('cod_status', [CodStatus::Pending, CodStatus::Collected])->sum('cod_amount')),
                'cod_collected' => Money::present((int) (clone $shipments)->where('cod_status', CodStatus::Collected)->sum('cod_amount')),
                'spent_30d' => Money::present((int) (clone $shipments)->where('created_at', '>=', $since)->where('status', '!=', ShipmentStatus::Cancelled)->sum('total')),
                'pending_orders' => $merchant->storeOrders()->where('status', StoreOrderStatus::Pending)->count(),
            ],
            'chart' => $chart,
            'carriers' => $carriers,
            'latest' => ShipmentResource::collection((clone $shipments)->with(['carrier', 'carrierService'])->latest('id')->limit(6)->get()),
        ]);
    }
}
