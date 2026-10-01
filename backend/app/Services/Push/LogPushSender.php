<?php

namespace App\Services\Push;

use Illuminate\Support\Facades\Log;

class LogPushSender implements PushSender
{
    /**
     * Log the push payload (used until FCM credentials are configured).
     *
     * @param  list<string>  $tokens
     * @param  array<string, string>  $data
     */
    public function send(array $tokens, string $title, string $body, array $data = []): void
    {
        Log::info('[PUSH] '.$title.' — '.$body, ['tokens' => count($tokens), 'data' => $data]);
    }
}
