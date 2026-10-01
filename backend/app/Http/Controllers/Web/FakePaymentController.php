<?php

namespace App\Http\Controllers\Web;

use App\Actions\Finance\TopupService;
use App\Http\Controllers\Controller;
use App\Models\Topup;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Simulated checkout used when PAYMENT_DRIVER=fake (local development and demos).
 */
class FakePaymentController extends Controller
{
    /**
     * Show the simulated checkout page.
     */
    public function show(Request $request, Topup $topup): View
    {
        abort_unless(config('masari.payments.driver') === 'fake', 404);

        return view('payments.fake', [
            'topup' => $topup,
            'redirect' => $request->query('redirect'),
            'signature' => $this->signature($topup),
        ]);
    }

    /**
     * Record the chosen outcome, settle the top-up and redirect back.
     */
    public function complete(Request $request, Topup $topup, TopupService $topups): RedirectResponse
    {
        abort_unless(config('masari.payments.driver') === 'fake', 404);
        abort_unless(hash_equals($this->signature($topup), (string) $request->input('signature')), 403);

        $outcome = $request->input('outcome') === 'paid' ? 'paid' : 'failed';
        $topup->update(['meta' => array_merge($topup->meta ?? [], ['fake_status' => $outcome])]);
        $topups->syncWithGateway($topup);

        $redirect = (string) $request->input('redirect');
        $separator = str_contains($redirect, '?') ? '&' : '?';

        return redirect()->away($redirect.$separator.'topup='.$topup->id);
    }

    /**
     * HMAC tying the completion form to the top-up shown on the signed page.
     */
    private function signature(Topup $topup): string
    {
        return hash_hmac('sha256', 'fake-topup-'.$topup->id, (string) config('app.key'));
    }
}
