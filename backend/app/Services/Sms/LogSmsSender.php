<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

class LogSmsSender implements SmsSender
{
    /**
     * Write the message to the log instead of sending it (local development).
     */
    public function send(string $phone, string $message): void
    {
        Log::info('[SMS] '.$phone.': '.$message);
    }
}
