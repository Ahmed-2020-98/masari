<?php

namespace App\Services\Payments;

use App\Models\Topup;
use Illuminate\Support\Facades\URL;

/**
 * Local development gateway: shows a simulated checkout page so the full top-up flow works without Tap keys.
 */
class FakeGateway implements PaymentGateway
{
    /**
     * Point the payer to the signed simulated checkout page.
     */
    public function createCharge(Topup $topup, string $redirectUrl): string
    {
        $topup->update(['gateway_reference' => 'fake_'.$topup->id]);

        return URL::temporarySignedRoute('payments.fake.show', now()->addHour(), ['topup' => $topup->id, 'redirect' => $redirectUrl]);
    }

    /**
     * The fake page records the chosen outcome in the top-up meta.
     */
    public function status(string $chargeId): string
    {
        $topup = Topup::query()->where('gateway_reference', $chargeId)->first();

        return $topup?->meta['fake_status'] ?? 'pending';
    }
}
