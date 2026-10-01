<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;

class UnifonicSmsSender implements SmsSender
{
    public function __construct(private string $appSid, private string $sender) {}

    /**
     * Send the message through the Unifonic REST API.
     */
    public function send(string $phone, string $message): void
    {
        Http::asForm()
            ->timeout(10)
            ->retry(2, 500)
            ->post('https://el.cloud.unifonic.com/rest/SMS/messages', [
                'AppSid' => $this->appSid,
                'SenderID' => $this->sender,
                'Recipient' => ltrim($phone, '+'),
                'Body' => $message,
            ])
            ->throw();
    }
}
