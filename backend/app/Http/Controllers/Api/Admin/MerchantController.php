<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\MerchantRole;
use App\Enums\MerchantStatus;
use App\Enums\ShipmentStatus;
use App\Enums\WalletTransactionType;
use App\Http\Controllers\Controller;
use App\Http\Resources\MerchantResource;
use App\Http\Resources\WalletTransactionResource;
use App\Models\Merchant;
use App\Models\User;
use App\Services\Wallet\WalletService;
use App\Support\Activity;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class MerchantController extends Controller
{
    /**
     * Merchants with search and status filter.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $merchants = Merchant::query()
            ->with(['plan', 'wallet'])
            ->withCount('shipments')
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->query('plan_id'), fn ($query, $plan) => $query->where('plan_id', $plan))
            ->when($request->query('search'), fn ($query, $term) => $query->where(fn ($inner) => $inner
                ->where('store_name', 'like', "%{$term}%")
                ->orWhere('name', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%")
                ->orWhere('id', $term)))
            ->latest('id')
            ->paginate(25);

        return MerchantResource::collection($merchants);
    }

    /**
     * Merchant profile with stats, team and recent ledger.
     */
    public function show(Merchant $merchant): JsonResponse
    {
        $merchant->load(['plan', 'wallet', 'rateOverrides.carrierService.carrier'])->loadCount('shipments');
        $byStatus = $merchant->shipments()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return response()->json([
            'merchant' => MerchantResource::make($merchant),
            'stats' => [
                'shipments' => $byStatus->sum(),
                'delivered' => (int) ($byStatus[ShipmentStatus::Delivered->value] ?? 0),
                'returned' => (int) ($byStatus[ShipmentStatus::Returned->value] ?? 0),
                'spent' => Money::present((int) $merchant->shipments()->where('status', '!=', ShipmentStatus::Cancelled)->sum('total')),
                'credit_limit' => Money::present($merchant->wallet?->credit_limit ?? 0),
            ],
            'team' => $merchant->users()->get()->map(fn (User $user) => [
                'id' => $user->id, 'name' => $user->name, 'phone' => $user->phone,
                'role' => MerchantRole::from($user->pivot->role)->present(),
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ]),
            'overrides' => $merchant->rateOverrides->map(fn ($override) => [
                'id' => $override->id,
                'carrier_service_id' => $override->carrier_service_id,
                'service' => $override->carrierService->carrier->name_ar.' — '.$override->carrierService->name_ar,
                'markup_type' => $override->markup_type,
                'markup_value' => $override->markup_value,
            ]),
            'transactions' => WalletTransactionResource::collection($merchant->wallet?->transactions()->latest('id')->limit(15)->get() ?? collect()),
        ]);
    }

    /**
     * Change status, plan or credit limit.
     */
    public function update(Request $request, Merchant $merchant, WalletService $wallets): MerchantResource
    {
        $data = $request->validate([
            'status' => ['sometimes', new Enum(MerchantStatus::class)],
            'plan_id' => ['sometimes', 'nullable', 'exists:plans,id'],
            'credit_limit' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $merchant->update(collect($data)->only(['status', 'plan_id'])->all());

        if (array_key_exists('credit_limit', $data)) {
            $wallets->for($merchant)->update(['credit_limit' => Money::toHalalas($data['credit_limit'])]);
        }

        Activity::log('admin.merchant_updated', $merchant, $data, $merchant->id);

        return MerchantResource::make($merchant->load(['plan', 'wallet']));
    }

    /**
     * Manual wallet credit/debit with a mandatory reason.
     */
    public function adjustWallet(Request $request, Merchant $merchant, WalletService $wallets): WalletTransactionResource
    {
        $data = $request->validate([
            'direction' => ['required', Rule::in(['credit', 'debit'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:190'],
        ]);

        $amount = Money::toHalalas($data['amount']);
        $transaction = $data['direction'] === 'credit'
            ? $wallets->credit($merchant, $amount, WalletTransactionType::Adjustment, $data['reason'], null, $request->user())
            : $wallets->debit($merchant, $amount, WalletTransactionType::Adjustment, $data['reason'], null, $request->user(), allowNegative: true);

        Activity::log('admin.wallet_adjusted', $merchant, $data, $merchant->id);

        return WalletTransactionResource::make($transaction);
    }

    /**
     * Create or update a per-merchant rate override.
     */
    public function storeOverride(Request $request, Merchant $merchant): JsonResponse
    {
        $data = $request->validate([
            'carrier_service_id' => ['required', 'exists:carrier_services,id'],
            'markup_type' => ['required', Rule::in(['percent', 'fixed'])],
            'markup_value' => ['required', 'integer', 'min:0'],
        ]);

        $override = $merchant->rateOverrides()->updateOrCreate(['carrier_service_id' => $data['carrier_service_id']], $data);
        Activity::log('admin.rate_override_saved', $override, $data, $merchant->id);

        return response()->json(['id' => $override->id], 201);
    }

    /**
     * Remove a rate override.
     */
    public function destroyOverride(Merchant $merchant, int $override): JsonResponse
    {
        $merchant->rateOverrides()->whereKey($override)->delete();

        return response()->json(['message' => 'تم الحذف.']);
    }
}
