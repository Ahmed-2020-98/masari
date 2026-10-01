<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\InvitationController;
use App\Http\Controllers\Api\Auth\MeController;
use App\Http\Controllers\Api\Auth\NotificationController;
use App\Http\Controllers\Api\Merchant;
use App\Http\Controllers\Api\Public\PublicController;
use App\Http\Controllers\Api\Webhooks\StoreWebhookController;
use App\Http\Controllers\Api\Webhooks\TapWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:api')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Public
    |--------------------------------------------------------------------------
    */
    Route::prefix('public')->name('public.')->group(function () {
        Route::get('cities', [PublicController::class, 'cities'])->name('cities');
        Route::get('carriers', [PublicController::class, 'carriers'])->name('carriers');
        Route::post('quote', [PublicController::class, 'quote'])->name('quote');
        Route::get('track/{awb}', [PublicController::class, 'track'])->name('track');
        Route::get('content', [PublicController::class, 'content'])->name('content');
        Route::post('contact', [PublicController::class, 'contact'])->middleware('throttle:otp')->name('contact');
        Route::get('invitations/{token}', [InvitationController::class, 'show'])->name('invitations.show');
    });

    /*
    |--------------------------------------------------------------------------
    | Auth (token based for web, admin and mobile)
    |--------------------------------------------------------------------------
    */
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('otp/send', [AuthController::class, 'sendOtp'])->middleware('throttle:otp')->name('otp.send');
        Route::post('otp/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:login')->name('otp.verify');
        Route::post('register', [AuthController::class, 'register'])->name('register');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
        Route::post('password/reset', [AuthController::class, 'resetPassword'])->name('password.reset');
        Route::post('invitations/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum')->name('logout');
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::prefix('me')->name('me.')->group(function () {
            Route::get('bootstrap', [MeController::class, 'bootstrap'])->name('bootstrap');
            Route::put('/', [MeController::class, 'update'])->name('update');
            Route::put('password', [MeController::class, 'updatePassword'])->name('password');
            Route::post('switch-merchant', [MeController::class, 'switchMerchant'])->name('switch');
            Route::get('sessions', [MeController::class, 'sessions'])->name('sessions');
            Route::delete('sessions/{session}', [MeController::class, 'destroySession'])->name('sessions.destroy');
            Route::post('device-tokens', [MeController::class, 'storeDeviceToken'])->name('devices.store');
            Route::delete('device-tokens', [MeController::class, 'destroyDeviceToken'])->name('devices.destroy');
            Route::get('notifications', [NotificationController::class, 'index'])->name('notifications');
            Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
            Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        });

        /*
        |--------------------------------------------------------------------------
        | Merchant
        |--------------------------------------------------------------------------
        */
        Route::prefix('merchant')->name('merchant.')->middleware('merchant')->group(function () {
            Route::get('dashboard', Merchant\DashboardController::class)->name('dashboard');
            Route::get('carriers', [Merchant\CarrierController::class, 'index'])->name('carriers');
            Route::post('quotes', Merchant\QuoteController::class)->name('quotes');

            Route::middleware('merchant:shipments')->group(function () {
                Route::get('shipments/export', [Merchant\ShipmentController::class, 'export'])->name('shipments.export');
                Route::post('shipments/labels', [Merchant\ShipmentController::class, 'labels'])->name('shipments.labels');
                Route::post('shipments/cancel', [Merchant\ShipmentController::class, 'bulkCancel'])->name('shipments.bulk-cancel');
                Route::get('shipments/bulk/template', [Merchant\BulkShipmentController::class, 'template'])->name('shipments.bulk.template');
                Route::post('shipments/bulk/preview', [Merchant\BulkShipmentController::class, 'preview'])->name('shipments.bulk.preview');
                Route::post('shipments/bulk', [Merchant\BulkShipmentController::class, 'store'])->name('shipments.bulk.store');
                Route::apiResource('shipments', Merchant\ShipmentController::class)->only(['index', 'store', 'show']);
                Route::post('shipments/{shipment}/cancel', [Merchant\ShipmentController::class, 'cancel'])->name('shipments.cancel');
                Route::post('shipments/{shipment}/return', [Merchant\ShipmentController::class, 'createReturn'])->name('shipments.return');
                Route::get('shipments/{shipment}/label', [Merchant\ShipmentController::class, 'label'])->name('shipments.label');

                Route::apiResource('pickups', Merchant\PickupController::class)->only(['index', 'store']);
            });

            Route::middleware('merchant:orders')->group(function () {
                Route::get('orders', [Merchant\StoreOrderController::class, 'index'])->name('orders.index');
                Route::get('orders/{storeOrder}', [Merchant\StoreOrderController::class, 'show'])->name('orders.show');
                Route::patch('orders/{storeOrder}', [Merchant\StoreOrderController::class, 'update'])->name('orders.update');
            });

            Route::middleware('merchant:addresses')->apiResource('addresses', Merchant\AddressController::class)->except('show');

            Route::middleware('merchant:wallet')->group(function () {
                Route::get('wallet', [Merchant\WalletController::class, 'show'])->name('wallet.show');
                Route::get('wallet/transactions', [Merchant\WalletController::class, 'transactions'])->name('wallet.transactions');
                Route::get('topups', [Merchant\TopupController::class, 'index'])->name('topups.index');
                Route::post('topups/card', [Merchant\TopupController::class, 'card'])->name('topups.card');
                Route::post('topups/bank', [Merchant\TopupController::class, 'bank'])->name('topups.bank');
                Route::get('topups/{topup}', [Merchant\TopupController::class, 'show'])->name('topups.show');
            });

            Route::middleware('merchant:cod')->group(function () {
                Route::get('cod/summary', [Merchant\CodController::class, 'summary'])->name('cod.summary');
                Route::get('cod', [Merchant\CodController::class, 'index'])->name('cod.index');
                Route::apiResource('payouts', Merchant\PayoutController::class)->only(['index', 'store']);
            });

            Route::middleware('merchant:invoices')->group(function () {
                Route::get('invoices', [Merchant\InvoiceController::class, 'index'])->name('invoices.index');
                Route::get('invoices/{month}', [Merchant\InvoiceController::class, 'show'])->name('invoices.show');
            });

            Route::middleware('merchant:integrations')->group(function () {
                Route::get('integrations', [Merchant\IntegrationController::class, 'index'])->name('integrations.index');
                Route::post('integrations/connect', [Merchant\IntegrationController::class, 'connect'])->name('integrations.connect');
                Route::patch('integrations/{storeConnection}', [Merchant\IntegrationController::class, 'update'])->name('integrations.update');
                Route::delete('integrations/{storeConnection}', [Merchant\IntegrationController::class, 'destroy'])->name('integrations.destroy');
                Route::get('api-tokens', [Merchant\ApiTokenController::class, 'index'])->name('api-tokens.index');
                Route::post('api-tokens', [Merchant\ApiTokenController::class, 'store'])->name('api-tokens.store');
                Route::delete('api-tokens/{token}', [Merchant\ApiTokenController::class, 'destroy'])->name('api-tokens.destroy');
                Route::apiResource('webhooks', Merchant\WebhookEndpointController::class)->except('show')->parameters(['webhooks' => 'webhookEndpoint']);
                Route::get('webhooks/{webhookEndpoint}/deliveries', [Merchant\WebhookEndpointController::class, 'deliveries'])->name('webhooks.deliveries');
            });

            Route::middleware('merchant:team')->group(function () {
                Route::get('team', [Merchant\TeamController::class, 'index'])->name('team.index');
                Route::post('team/invitations', [Merchant\TeamController::class, 'invite'])->name('team.invite');
                Route::delete('team/invitations/{invitation}', [Merchant\TeamController::class, 'cancelInvitation'])->name('team.invitations.destroy');
                Route::patch('team/{user}', [Merchant\TeamController::class, 'update'])->name('team.update');
                Route::delete('team/{user}', [Merchant\TeamController::class, 'destroy'])->name('team.destroy');
            });

            Route::middleware('merchant:tickets')->group(function () {
                Route::apiResource('tickets', Merchant\TicketController::class)->only(['index', 'store', 'show']);
                Route::post('tickets/{ticket}/reply', [Merchant\TicketController::class, 'reply'])->name('tickets.reply');
                Route::post('tickets/{ticket}/close', [Merchant\TicketController::class, 'close'])->name('tickets.close');
                Route::get('tickets/{ticket}/attachments/{file}', [Merchant\TicketController::class, 'attachment'])->name('tickets.attachment');
            });

            Route::get('settings', [Merchant\SettingsController::class, 'show'])->name('settings.show');
            Route::put('settings', [Merchant\SettingsController::class, 'update'])->middleware('merchant:team')->name('settings.update');
        });

        /*
        |--------------------------------------------------------------------------
        | Admin (back-office)
        |--------------------------------------------------------------------------
        */
        Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
            Route::get('dashboard', Admin\DashboardController::class)->name('dashboard');

            Route::middleware('admin:merchants.manage')->group(function () {
                Route::apiResource('merchants', Admin\MerchantController::class)->only(['index', 'show', 'update']);
                Route::post('merchants/{merchant}/wallet', [Admin\MerchantController::class, 'adjustWallet'])->middleware('admin:finance.manage')->name('merchants.wallet');
                Route::post('merchants/{merchant}/overrides', [Admin\MerchantController::class, 'storeOverride'])->name('merchants.overrides.store');
                Route::delete('merchants/{merchant}/overrides/{override}', [Admin\MerchantController::class, 'destroyOverride'])->name('merchants.overrides.destroy');
            });

            Route::middleware('admin:shipments.manage')->group(function () {
                Route::apiResource('shipments', Admin\ShipmentController::class)->only(['index', 'show']);
                Route::post('shipments/{shipment}/status', [Admin\ShipmentController::class, 'updateStatus'])->name('shipments.status');
                Route::post('shipments/{shipment}/sync', [Admin\ShipmentController::class, 'sync'])->name('shipments.sync');
            });

            Route::middleware('admin:carriers.manage')->group(function () {
                Route::apiResource('carriers', Admin\CarrierController::class)->only(['index', 'store', 'update']);
                Route::post('carriers/{carrier}/services', [Admin\CarrierController::class, 'saveService'])->name('carriers.services');
                Route::apiResource('plans', Admin\PlanController::class)->only(['index', 'store', 'update']);
                Route::get('cities', [Admin\CityController::class, 'index'])->name('cities.index');
                Route::patch('cities/{city}', [Admin\CityController::class, 'update'])->name('cities.update');
            });

            Route::middleware('admin:finance.manage')->group(function () {
                Route::get('topups', [Admin\FinanceController::class, 'topups'])->name('topups.index');
                Route::post('topups/{topup}/approve', [Admin\FinanceController::class, 'approveTopup'])->name('topups.approve');
                Route::post('topups/{topup}/reject', [Admin\FinanceController::class, 'rejectTopup'])->name('topups.reject');
                Route::get('topups/{topup}/receipt', [Admin\FinanceController::class, 'topupReceipt'])->name('topups.receipt');
                Route::get('cod', [Admin\FinanceController::class, 'codOverview'])->name('cod.overview');
                Route::get('cod/shipments', [Admin\FinanceController::class, 'codShipments'])->name('cod.shipments');
                Route::post('cod/settle', [Admin\FinanceController::class, 'settleCod'])->name('cod.settle');
                Route::get('payouts', [Admin\FinanceController::class, 'payouts'])->name('payouts.index');
                Route::post('payouts/{payoutRequest}/approve', [Admin\FinanceController::class, 'approvePayout'])->name('payouts.approve');
                Route::post('payouts/{payoutRequest}/reject', [Admin\FinanceController::class, 'rejectPayout'])->name('payouts.reject');
            });

            Route::middleware('admin:support.manage')->group(function () {
                Route::apiResource('tickets', Admin\TicketController::class)->only(['index', 'show', 'update']);
                Route::post('tickets/{ticket}/reply', [Admin\TicketController::class, 'reply'])->name('tickets.reply');
                Route::get('tickets/{ticket}/attachments/{file}', [Admin\TicketController::class, 'attachment'])->name('tickets.attachment');
            });

            Route::middleware('admin:content.manage')->group(function () {
                Route::get('content', [Admin\ContentController::class, 'show'])->name('content.show');
                Route::put('content', [Admin\ContentController::class, 'update'])->name('content.update');
            });

            Route::middleware('admin:admins.manage')->group(function () {
                Route::get('admins', [Admin\AdminUserController::class, 'index'])->name('admins.index');
                Route::post('admins', [Admin\AdminUserController::class, 'store'])->name('admins.store');
                Route::patch('admins/{user}', [Admin\AdminUserController::class, 'update'])->name('admins.update');
                Route::get('activity', [Admin\ActivityLogController::class, 'index'])->name('activity.index');
            });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Incoming webhooks
    |--------------------------------------------------------------------------
    */
    Route::post('webhooks/tap', TapWebhookController::class)->name('webhooks.tap')->withoutMiddleware('throttle:api');
    Route::post('webhooks/stores/{platform}', StoreWebhookController::class)->name('webhooks.stores')->withoutMiddleware('throttle:api');
});
