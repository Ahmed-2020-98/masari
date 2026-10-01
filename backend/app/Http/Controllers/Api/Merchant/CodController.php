<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\CodStatus;
use App\Enums\PayoutStatus;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ShipmentResource;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CodController extends Controller
{
    use InteractsWithMerchant;

    /**
     * COD totals by stage.
     */
    public function summary(Request $request): JsonResponse
    {
        $merchant = $this->merchant($request);
        $sum = fn (CodStatus $status): int => (int) $merchant->shipments()->where('cod_status', $status)->sum('cod_amount');

        return response()->json([
            'pending' => Money::present($sum(CodStatus::Pending)),
            'collected' => Money::present($sum(CodStatus::Collected)),
            'credited' => Money::present($sum(CodStatus::Credited)),
            'paid_out' => Money::present((int) $merchant->payoutRequests()->where('status', PayoutStatus::Approved)->sum('amount')),
            'statuses' => CodStatus::options(),
        ]);
    }

    /**
     * COD shipments.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $shipments = $this->merchant($request)->shipments()
            ->with('carrier')
            ->where('cod_amount', '>', 0)
            ->when($request->query('cod_status'), fn ($query, $status) => $query->where('cod_status', $status))
            ->when($request->query('search'), fn ($query, $term) => $query->where(fn ($inner) => $inner->where('awb', 'like', "%{$term}%")->orWhere('recipient->name', 'like', "%{$term}%")))
            ->latest('id')
            ->paginate(25);

        return ShipmentResource::collection($shipments);
    }
}
