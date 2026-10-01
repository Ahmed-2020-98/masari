<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Finance\CreditCodAction;
use App\Actions\Finance\PayoutService;
use App\Actions\Finance\TopupService;
use App\Enums\CodStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CodSettlementResource;
use App\Http\Resources\PayoutRequestResource;
use App\Http\Resources\ShipmentResource;
use App\Http\Resources\TopupResource;
use App\Models\Carrier;
use App\Models\CodSettlement;
use App\Models\PayoutRequest;
use App\Models\Shipment;
use App\Models\Topup;
use App\Support\Activity;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceController extends Controller
{
    /**
     * Top-ups queue.
     */
    public function topups(Request $request): AnonymousResourceCollection
    {
        return TopupResource::collection(
            Topup::query()->with('merchant')
                ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
                ->when($request->query('method'), fn ($query, $method) => $query->where('method', $method))
                ->latest('id')->paginate(25)
        );
    }

    /**
     * Approve a bank transfer top-up.
     */
    public function approveTopup(Request $request, Topup $topup, TopupService $topups): TopupResource
    {
        $topups->markPaid($topup, $request->user());
        Activity::log('admin.topup_approved', $topup);

        return TopupResource::make($topup->refresh()->load('merchant'));
    }

    /**
     * Reject a bank transfer top-up.
     */
    public function rejectTopup(Request $request, Topup $topup, TopupService $topups): TopupResource
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:190']]);
        $topups->reject($topup, $request->user(), $data['reason']);
        Activity::log('admin.topup_rejected', $topup, $data);

        return TopupResource::make($topup->load('merchant'));
    }

    /**
     * Download the uploaded bank receipt.
     */
    public function topupReceipt(Topup $topup): StreamedResponse
    {
        abort_unless($topup->receipt_path && Storage::disk('local')->exists($topup->receipt_path), 404);

        return Storage::disk('local')->response($topup->receipt_path);
    }

    /**
     * COD collected by carriers and awaiting settlement, grouped per carrier.
     */
    public function codOverview(): JsonResponse
    {
        $rows = Shipment::query()
            ->where('cod_status', CodStatus::Collected)
            ->groupBy('carrier_id')
            ->select('carrier_id', DB::raw('count(*) as shipments'), DB::raw('sum(cod_amount) as total'))
            ->get();

        $carriers = Carrier::query()->whereIn('id', $rows->pluck('carrier_id'))->get()->keyBy('id');

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'carrier' => ['id' => $row->carrier_id, 'name' => $carriers[$row->carrier_id]->name_ar, 'brand_color' => $carriers[$row->carrier_id]->brand_color],
                'shipments' => (int) $row->shipments,
                'total' => Money::present((int) $row->total),
            ]),
            'settlements' => CodSettlementResource::collection(CodSettlement::query()->with('carrier')->latest('id')->limit(20)->get()),
        ]);
    }

    /**
     * Collected COD shipments for a carrier (to reconcile against the remittance sheet).
     */
    public function codShipments(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate(['carrier_id' => ['required', 'exists:carriers,id']]);

        return ShipmentResource::collection(
            Shipment::query()->with(['merchant', 'carrier'])
                ->where('carrier_id', $data['carrier_id'])
                ->where('cod_status', CodStatus::Collected)
                ->when($request->query('search'), fn ($query, $term) => $query->where('awb', 'like', "%{$term}%"))
                ->orderBy('delivered_at')
                ->paginate(100)
        );
    }

    /**
     * Settle selected shipments (by id or pasted AWBs) and credit merchant wallets.
     */
    public function settleCod(Request $request, CreditCodAction $credit): CodSettlementResource
    {
        $data = $request->validate([
            'carrier_id' => ['required', 'exists:carriers,id'],
            'shipment_ids' => ['nullable', 'array'],
            'shipment_ids.*' => ['string'],
            'awbs' => ['nullable', 'string'],
            'reference' => ['nullable', 'string', 'max:120'],
            'remitted_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $awbs = preg_split('/[\s,]+/', (string) ($data['awbs'] ?? ''), -1, PREG_SPLIT_NO_EMPTY);
        $ids = Shipment::query()
            ->where(fn ($query) => $query->whereIn('uuid', $data['shipment_ids'] ?? [])->orWhereIn('awb', $awbs))
            ->pluck('id')->all();

        $settlement = $credit->handle(Carrier::query()->findOrFail($data['carrier_id']), $ids, $request->user(), $data['reference'] ?? null, $data['remitted_on'] ?? null, $data['notes'] ?? null);
        Activity::log('admin.cod_settled', $settlement, ['count' => $settlement->shipments_count]);

        return CodSettlementResource::make($settlement->load('carrier'));
    }

    /**
     * Payout requests queue.
     */
    public function payouts(Request $request): AnonymousResourceCollection
    {
        return PayoutRequestResource::collection(
            PayoutRequest::query()->with('merchant')
                ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
                ->latest('id')->paginate(25)
        );
    }

    /**
     * Mark a payout as transferred.
     */
    public function approvePayout(Request $request, PayoutRequest $payoutRequest, PayoutService $payouts): PayoutRequestResource
    {
        $data = $request->validate([
            'transfer_reference' => ['nullable', 'string', 'max:120'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $payouts->approve($payoutRequest, $request->user(), $data['transfer_reference'] ?? null, $request->file('proof'));
        Activity::log('admin.payout_approved', $payoutRequest);

        return PayoutRequestResource::make($payoutRequest->load('merchant'));
    }

    /**
     * Reject a payout and refund the wallet.
     */
    public function rejectPayout(Request $request, PayoutRequest $payoutRequest, PayoutService $payouts): PayoutRequestResource
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:190']]);
        $payouts->reject($payoutRequest, $request->user(), $data['reason']);
        Activity::log('admin.payout_rejected', $payoutRequest, $data);

        return PayoutRequestResource::make($payoutRequest->load('merchant'));
    }
}
