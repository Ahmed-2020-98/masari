<?php

namespace App\Services\Sms;

interface SmsSender
{
    /**
     * Send a text message to an E.164 phone number.
     */
    public function send(string $phone, string $message): void;
}
