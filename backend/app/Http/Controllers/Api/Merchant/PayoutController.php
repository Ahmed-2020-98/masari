<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Actions\Finance\PayoutService;
use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PayoutRequestResource;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PayoutController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Payout request history.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return PayoutRequestResource::collection($this->merchant($request)->payoutRequests()->latest('id')->paginate(20));
    }

    /**
     * Request a bank transfer of wallet funds.
     */
    public function store(Request $request, PayoutService $payouts): JsonResponse
    {
        $data = $request->validate(['amount' => ['required', 'numeric', 'min:1']]);

        $payout = $payouts->request($this->merchant($request), $request->user(), Money::toHalalas($data['amount']));

        return PayoutRequestResource::make($payout)->response()->setStatusCode(201);
    }
}
