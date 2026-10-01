<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\CodStatus;
use App\Enums\PayoutStatus;
use App\Enums\ShipmentStatus;
use App\Enums\TicketStatus;
use App\Enums\TopupStatus;
use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\PayoutRequest;
use App\Models\Shipment;
use App\Models\Ticket;
use App\Models\Topup;
use App\Models\Wallet;
use App\Support\Money;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Platform-wide KPIs for the selected period (default 30 days).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $days = min(max((int) $request->integer('days', 30), 7), 365);
        $since = now()->subDays($days - 1)->startOfDay();
        $billable = Shipment::query()->where('shipments.created_at', '>=', $since)->where('shipments.status', '!=', ShipmentStatus::Cancelled);

        $totals = (clone $billable)->selectRaw('count(*) as shipments, sum(total) as gmv, sum(price) as revenue, sum(carrier_cost) as cost')->first();

        $daily = (clone $billable)
            ->selectRaw('DATE(shipments.created_at) as day, count(*) as shipments, sum(shipments.price - shipments.carrier_cost) as margin')
            ->groupBy('day')->get()->keyBy('day');

        return response()->json([
            'kpis' => [
                'shipments' => (int) $totals->shipments,
                'gmv' => Money::present((int) $totals->gmv),
                'revenue' => Money::present((int) $totals->revenue),
                'margin' => Money::present((int) $totals->revenue - (int) $totals->cost),
                'merchants' => Merchant::query()->count(),
                'new_merchants' => Merchant::query()->where('created_at', '>=', $since)->count(),
                'wallets_total' => Money::present((int) Wallet::query()->sum('balance')),
                'cod_to_settle' => Money::present((int) Shipment::query()->where('cod_status', CodStatus::Collected)->sum('cod_amount')),
                'delivery_rate' => ($done = (clone $billable)->whereIn('shipments.status', [ShipmentStatus::Delivered, ShipmentStatus::Returned])->count()) > 0
                    ? round((clone $billable)->where('shipments.status', ShipmentStatus::Delivered)->count() / $done * 100, 1)
                    : null,
            ],
            'queues' => [
                'topups' => Topup::query()->where('status', TopupStatus::Pending)->count(),
                'payouts' => PayoutRequest::query()->where('status', PayoutStatus::Pending)->count(),
                'tickets' => Ticket::query()->where('status', TicketStatus::Open)->count(),
                'failed_attempts' => Shipment::query()->where('status', ShipmentStatus::FailedAttempt)->count(),
            ],
            'chart' => collect(CarbonPeriod::create($since, now()))->map(fn ($day) => [
                'date' => $day->toDateString(),
                'shipments' => (int) ($daily[$day->toDateString()]->shipments ?? 0),
                'margin' => round(((int) ($daily[$day->toDateString()]->margin ?? 0)) / 100, 2),
            ]),
            'carriers' => (clone $billable)
                ->join('carriers', 'carriers.id', '=', 'shipments.carrier_id')
                ->groupBy('carriers.id', 'carriers.name_ar', 'carriers.brand_color')
                ->select('carriers.name_ar as name', 'carriers.brand_color as color', DB::raw('count(*) as total'), DB::raw('sum(shipments.price - shipments.carrier_cost) as margin'))
                ->orderByDesc('total')->get()
                ->map(fn ($row) => ['name' => $row->name, 'color' => $row->color, 'total' => (int) $row->total, 'margin' => Money::present((int) $row->margin)]),
            'statuses' => (clone $billable)->selectRaw('shipments.status, count(*) as total')->groupBy('shipments.status')->get()
                ->map(fn (Shipment $row) => $row->status->present() + ['total' => (int) $row->total]),
            'top_merchants' => (clone $billable)
                ->join('merchants', 'merchants.id', '=', 'shipments.merchant_id')
                ->groupBy('merchants.id', 'merchants.store_name')
                ->select('merchants.id', 'merchants.store_name', DB::raw('count(*) as shipments'), DB::raw('sum(shipments.total) as gmv'))
                ->orderByDesc('shipments')->limit(8)->get()
                ->map(fn ($row) => ['id' => $row->id, 'store_name' => $row->store_name, 'shipments' => (int) $row->shipments, 'gmv' => Money::present((int) $row->gmv)]),
        ]);
    }
}
