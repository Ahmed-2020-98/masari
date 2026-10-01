<?php

namespace App\Services;

use App\Models\Merchant;
use App\Notifications\MerchantNotification;
use Illuminate\Support\Facades\Notification;

class MerchantNotifier
{
    /**
     * Notify every member of the merchant account.
     *
     * @param  array<string, string|int|null>  $data
     */
    public function notify(Merchant $merchant, string $kind, string $title, string $body, array $data = [], string $color = 'blue'): void
    {
        Notification::send(
            $merchant->users()->where('is_active', true)->get(),
            new MerchantNotification($kind, $title, $body, $data, $color),
        );
    }
}
