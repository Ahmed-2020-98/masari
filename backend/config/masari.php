<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Business rules
    |--------------------------------------------------------------------------
    */

    'vat_rate' => (float) env('MASARI_VAT_RATE', 0.15),

    'volumetric_divisor' => (int) env('MASARI_VOLUMETRIC_DIVISOR', 5000),

    'min_topup' => (int) env('MASARI_MIN_TOPUP', 5000),

    'min_payout' => (int) env('MASARI_MIN_PAYOUT', 10000),

    'web_url' => env('MASARI_WEB_URL', 'http://localhost:4310'),

    'admin_url' => env('MASARI_ADMIN_URL', 'http://localhost:4311'),

    'mobile' => [
        'min_version' => env('MASARI_MOBILE_MIN_VERSION', '1.0.0'),
    ],

    /*
    |--------------------------------------------------------------------------
    | OTP
    |--------------------------------------------------------------------------
    */

    'otp' => [
        'length' => 4,
        'ttl_minutes' => 5,
        'max_attempts' => 5,
        'resend_seconds' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Drivers (swap to real providers via .env)
    |--------------------------------------------------------------------------
    */

    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'),
        'unifonic' => [
            'app_sid' => env('UNIFONIC_APP_SID'),
            'sender' => env('UNIFONIC_SENDER', 'Masari'),
        ],
    ],

    'push' => [
        'driver' => env('PUSH_DRIVER', 'log'),
        'fcm_project_id' => env('FCM_PROJECT_ID'),
        'fcm_credentials' => env('FCM_CREDENTIALS_PATH'),
    ],

    'payments' => [
        'driver' => env('PAYMENT_DRIVER', 'fake'),
        'tap' => [
            'secret_key' => env('TAP_SECRET_KEY'),
            'public_key' => env('TAP_PUBLIC_KEY'),
            'merchant_id' => env('TAP_MERCHANT_ID'),
            'base_url' => env('TAP_BASE_URL', 'https://api.tap.company/v2'),
        ],
        'bank_accounts' => [
            ['bank' => 'مصرف الراجحي', 'holder' => 'شركة مساري للخدمات اللوجستية', 'iban' => 'SA0380000000608010167519'],
            ['bank' => 'البنك الأهلي السعودي', 'holder' => 'شركة مساري للخدمات اللوجستية', 'iban' => 'SA4410000001400000123456'],
        ],
    ],

    'integrations' => [
        'salla' => [
            'client_id' => env('SALLA_CLIENT_ID'),
            'client_secret' => env('SALLA_CLIENT_SECRET'),
            'webhook_secret' => env('SALLA_WEBHOOK_SECRET'),
            'authorize_url' => 'https://accounts.salla.sa/oauth2/auth',
            'token_url' => 'https://accounts.salla.sa/oauth2/token',
            'api_url' => 'https://api.salla.dev/admin/v2',
        ],
        'zid' => [
            'client_id' => env('ZID_CLIENT_ID'),
            'client_secret' => env('ZID_CLIENT_SECRET'),
            'webhook_secret' => env('ZID_WEBHOOK_SECRET'),
            'authorize_url' => 'https://oauth.zid.sa/oauth/authorize',
            'token_url' => 'https://oauth.zid.sa/oauth/token',
            'api_url' => 'https://api.zid.sa/v1',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Mock carrier simulation
    |--------------------------------------------------------------------------
    |
    | Minutes between simulated tracking steps for the mock driver.
    */

    'mock_carrier' => [
        'step_minutes' => (int) env('MOCK_CARRIER_STEP_MINUTES', 2),
        'failure_rate' => (float) env('MOCK_CARRIER_FAILURE_RATE', 0.08),
    ],

];
