<?php

namespace App\Notifications\Channels;

use App\Services\Push\PushSender;
use Illuminate\Notifications\Notification;

class PushChannel
{
    public function __construct(private PushSender $sender) {}

    /**
     * Send the notification's push representation to the user's registered devices.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        $tokens = $notifiable->routeNotificationFor('fcm', $notification);

        if (empty($tokens) || ! method_exists($notification, 'toPush')) {
            return;
        }

        $message = $notification->toPush($notifiable);

        $this->sender->send($tokens, $message['title'], $message['body'], $message['data'] ?? []);
    }
}
