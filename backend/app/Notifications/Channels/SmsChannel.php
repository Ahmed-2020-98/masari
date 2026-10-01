<?php

namespace App\Notifications\Channels;

use App\Services\Sms\SmsSender;
use Illuminate\Notifications\Notification;

class SmsChannel
{
    public function __construct(private SmsSender $sender) {}

    /**
     * Send the notification's SMS representation.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        $phone = $notifiable->routeNotificationFor('sms', $notification);

        if (! $phone || ! method_exists($notification, 'toSms')) {
            return;
        }

        $this->sender->send($phone, $notification->toSms($notifiable));
    }
}
