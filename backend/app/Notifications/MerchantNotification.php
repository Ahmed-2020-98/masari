<?php

namespace App\Notifications;

use App\Notifications\Channels\PushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Generic in-app + push notification for merchant users.
 * The `type` and `data` fields let web and mobile clients deep-link to the right screen.
 */
class MerchantNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, string|int|null>  $data
     */
    public function __construct(
        public string $kind,
        public string $title,
        public string $body,
        public array $data = [],
        public string $color = 'blue',
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database', PushChannel::class];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'kind' => $this->kind,
            'title' => $this->title,
            'body' => $this->body,
            'color' => $this->color,
            'data' => $this->data,
        ];
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toPush(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'data' => array_map('strval', array_filter($this->data + ['kind' => $this->kind], fn ($value) => $value !== null)),
        ];
    }
}
