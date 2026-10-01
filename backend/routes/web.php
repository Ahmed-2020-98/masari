<?php

use App\Http\Controllers\Web\FakePaymentController;
use App\Http\Controllers\Web\IntegrationCallbackController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'Masari API', 'docs' => url('/docs/api')]));

Route::get('integrations/{platform}/callback', IntegrationCallbackController::class)->name('integrations.callback');

Route::get('payments/fake/{topup}', [FakePaymentController::class, 'show'])->middleware('signed')->name('payments.fake.show');
Route::post('payments/fake/{topup}', [FakePaymentController::class, 'complete'])->name('payments.fake.complete');
