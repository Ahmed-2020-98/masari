<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Actions\Finance\TopupService;
use App\Http\Controllers\Controller;
use App\Models\Topup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TapWebhookController extends Controller
{
    /**
     * Tap posts charge updates here; we re-fetch the charge from Tap rather than trusting the payload.
     */
    public function __invoke(Request $request, TopupService $topups): JsonResponse
    {
        $chargeId = (string) $request->input('id');
        $topup = $chargeId ? Topup::query()->where('gateway_reference', $chargeId)->first() : null;

        if ($topup) {
            $topups->syncWithGateway($topup);
        }

        return response()->json(['received' => true]);
    }
}
