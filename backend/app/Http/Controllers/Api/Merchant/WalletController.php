<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Enums\TopupStatus;
use App\Enums\WalletTransactionType;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\WalletTransactionResource;
use App\Services\Wallet\WalletService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WalletController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Balance and 30-day movement summary.
     */
    public function show(Request $request, WalletService $wallets): JsonResponse
    {
        $merchant = $this->merchant($request);
        $wallet = $wallets->for($merchant);
        $recent = $wallet->transactions()->where('created_at', '>=', now()->subDays(30));

        return response()->json([
            'balance' => Money::present($wallet->balance),
            'credit_limit' => Money::present($wallet->credit_limit),
            'pending_topups' => Money::present((int) $merchant->topups()->where('status', TopupStatus::Pending)->sum('amount')),
            'last_30_days' => [
                'credits' => Money::present((int) (clone $recent)->where('amount', '>', 0)->sum('amount')),
                'debits' => Money::present((int) abs((clone $recent)->where('amount', '<', 0)->sum('amount'))),
            ],
            'types' => WalletTransactionType::options(),
        ]);
    }

    /**
     * Ledger entries.
     */
    public function transactions(Request $request, WalletService $wallets): AnonymousResourceCollection
    {
        $transactions = $wallets->for($this->merchant($request))->transactions()
            ->when($request->query('type'), fn ($query, $type) => $query->where('type', $type))
            ->when($request->query('direction') === 'in', fn ($query) => $query->where('amount', '>', 0))
            ->when($request->query('direction') === 'out', fn ($query) => $query->where('amount', '<', 0))
            ->when($request->query('date_from'), fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($request->query('date_to'), fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->orderByDesc('id')
            ->paginate(25);

        return WalletTransactionResource::collection($transactions);
    }
}
