<?php

namespace App\Http\Controllers\Web;

use App\Enums\StorePlatform;
use App\Http\Controllers\Controller;
use App\Models\StoreConnection;
use App\Services\Integrations\IntegrationManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class IntegrationCallbackController extends Controller
{
    /**
     * OAuth redirect target for Salla / Zid; stores tokens and returns the merchant to the dashboard.
     */
    public function __invoke(Request $request, string $platform, IntegrationManager $integrations): RedirectResponse
    {
        $platform = StorePlatform::tryFrom($platform) ?? abort(404);
        $back = rtrim(config('masari.web_url'), '/').'/dashboard/integrations';

        try {
            $state = json_decode(Crypt::decryptString((string) $request->query('state')), true);
            abort_if(now()->timestamp - $state['ts'] > 1800, 403);

            $details = $integrations->for($platform)->exchangeCode((string) $request->query('code'));

            $connection = StoreConnection::query()->updateOrCreate(
                ['platform' => $platform, 'store_id' => $details['store_id']],
                [
                    'merchant_id' => $state['merchant_id'],
                    'store_name' => $details['store_name'],
                    'store_url' => $details['store_url'],
                    'access_token' => $details['access_token'],
                    'refresh_token' => $details['refresh_token'],
                    'token_expires_at' => $details['expires_in'] ? now()->addSeconds($details['expires_in']) : null,
                    'status' => 'active',
                ],
            );

            if (empty($connection->settings['webhook_token'])) {
                $connection->update(['settings' => array_merge($connection->settings ?? [], ['webhook_token' => Str::random(40)])]);
            }

            return redirect()->away($back.'?connected='.$platform->value);
        } catch (Throwable $exception) {
            Log::warning('Store OAuth failed', ['platform' => $platform->value, 'error' => $exception->getMessage()]);

            return redirect()->away($back.'?error='.$platform->value);
        }
    }
}
