<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Actions\Finance\TopupService;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TopupResource;
use App\Models\Topup;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TopupController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Top-up history.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return TopupResource::collection($this->merchant($request)->topups()->latest('id')->paginate(20));
    }

    /**
     * Start a card / mada / Apple Pay top-up. `redirect_url` is where the payer lands afterwards (web page or app deep link).
     */
    public function card(Request $request, TopupService $topups): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:100000'],
            'redirect_url' => ['required', 'url'],
        ]);

        $result = $topups->startCard($this->merchant($request), $request->user(), Money::toHalalas($data['amount']), $data['redirect_url']);

        return response()->json([
            'topup' => TopupResource::make($result['topup']),
            'payment_url' => $result['payment_url'],
        ], 201);
    }

    /**
     * Submit a bank transfer receipt for review.
     */
    public function bank(Request $request, TopupService $topups): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000000'],
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'transfer_reference' => ['nullable', 'string', 'max:120'],
        ]);

        $topup = $topups->submitBankTransfer($this->merchant($request), $request->user(), Money::toHalalas($data['amount']), $data['receipt'], $data['bank_name'] ?? null, $data['transfer_reference'] ?? null);

        return TopupResource::make($topup)->response()->setStatusCode(201);
    }

    /**
     * Top-up status; re-checks card payments with the gateway (used after redirect).
     */
    public function show(Request $request, Topup $topup, TopupService $topups): TopupResource
    {
        $this->ensureOwned($request, $topup);

        return TopupResource::make($topups->syncWithGateway($topup));
    }
}
