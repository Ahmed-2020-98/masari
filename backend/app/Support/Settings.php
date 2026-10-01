<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class Settings
{
    /**
     * Read a JSON setting (cached).
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::rememberForever("settings.{$key}", fn () => Setting::query()->where('key', $key)->value('value')) ?? $default;
    }

    /**
     * Write a JSON setting and bust the cache.
     */
    public static function put(string $key, mixed $value): void
    {
        Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("settings.{$key}");
    }
}
