<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

class Activity
{
    /**
     * Record an audit log entry for the current request.
     *
     * @param  array<string, mixed>  $properties
     */
    public static function log(string $action, ?Model $subject = null, array $properties = [], ?int $merchantId = null): void
    {
        $request = request();

        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'merchant_id' => $merchantId ?? ($subject?->getAttribute('merchant_id')),
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'properties' => $properties ?: null,
            'ip_address' => $request->ip(),
        ]);
    }
}
