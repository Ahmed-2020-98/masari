<?php

namespace App\Services\Push;

interface PushSender
{
    /**
     * Deliver a push notification to device tokens.
     *
     * @param  list<string>  $tokens
     * @param  array<string, string>  $data
     */
    public function send(array $tokens, string $title, string $body, array $data = []): void;
}
