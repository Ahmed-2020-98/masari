<?php

namespace App\Services\Payments;

use App\Models\Topup;

interface PaymentGateway
{
    /**
     * Create a hosted payment for the top-up and return the URL the payer must visit.
     */
    public function createCharge(Topup $topup, string $redirectUrl): string;

    /**
     * Fetch the authoritative charge status from the gateway: paid, failed or pending.
     */
    public function status(string $chargeId): string;
}
