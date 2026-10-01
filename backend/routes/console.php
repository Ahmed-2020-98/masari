<?php

use App\Actions\Shipments\ApplyTrackingEventsAction;
use App\Models\Shipment;
use App\Services\Carriers\CarrierManager;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('masari:track {--limit=500}', function (CarrierManager $carriers, ApplyTrackingEventsAction $apply) {
    $processed = 0;

    Shipment::query()
        ->trackable()
        ->with('carrier')
        ->orderBy('last_tracked_at')
        ->limit((int) $this->option('limit'))
        ->get()
        ->each(function (Shipment $shipment) use ($carriers, $apply, &$processed): void {
            try {
                $apply->handle($shipment, $carriers->for($shipment->carrier)->track($shipment));
                $processed++;
            } catch (Throwable $exception) {
                Log::warning('Tracking sync failed', ['shipment' => $shipment->id, 'error' => $exception->getMessage()]);
            }
        });

    $this->info("Tracked {$processed} shipments.");
})->purpose('Pull tracking updates from carriers for active shipments');

Schedule::command('masari:track')->everyMinute()->withoutOverlapping()->runInBackground();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
