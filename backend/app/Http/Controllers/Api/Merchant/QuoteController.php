<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Concerns\InteractsWithMerchant;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Services\Pricing\PricingService;
use App\Services\Pricing\Quote;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuoteController extends Controller
{
    use InteractsWithMerchant;

    /**
     * Compare every carrier's price and ETA for the merchant's plan.
     */
    public function __invoke(Request $request, PricingService $pricing): JsonResponse
    {
        $data = $request->validate([
            'origin_city_id' => ['required', 'exists:cities,id'],
            'destination_city_id' => ['required', 'exists:cities,id'],
            'weight_kg' => ['required', 'numeric', 'min:0.1', 'max:70'],
            'dimensions' => ['nullable', 'array'],
            'dimensions.length' => ['nullable', 'numeric'],
            'dimensions.width' => ['nullable', 'numeric'],
            'dimensions.height' => ['nullable', 'numeric'],
            'cod_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $quotes = $pricing->quotes(
            $this->merchant($request),
            City::query()->findOrFail($data['origin_city_id']),
            City::query()->findOrFail($data['destination_city_id']),
            (float) $data['weight_kg'],
            $data['dimensions'] ?? null,
            Money::toHalalas($data['cod_amount'] ?? 0),
        );

        $cheapest = $quotes->min('total');
        $fastest = $quotes->min(fn (Quote $quote) => $quote->service->eta_max_days);

        return response()->json([
            'data' => $quotes->map(fn (Quote $quote) => $quote->toArray() + [
                'is_cheapest' => $quote->total === $cheapest,
                'is_fastest' => $quote->service->eta_max_days === $fastest,
            ])->values(),
            'wallet' => Money::present($this->merchant($request)->wallet?->balance ?? 0),
        ]);
    }
}
