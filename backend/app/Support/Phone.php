<?php

namespace App\Support;

class Phone
{
    /**
     * Normalize Saudi mobile numbers to E.164 (+9665XXXXXXXX).
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', strtr($phone, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ])) ?? '';

        $digits = match (true) {
            str_starts_with($digits, '00966') => substr($digits, 5),
            str_starts_with($digits, '966') => substr($digits, 3),
            str_starts_with($digits, '0') => substr($digits, 1),
            default => $digits,
        };

        return '+966'.$digits;
    }

    /**
     * Whether the value is a valid Saudi mobile number after normalization.
     */
    public static function isValidSaudiMobile(string $phone): bool
    {
        return (bool) preg_match('/^\+9665\d{8}$/', self::normalize($phone));
    }
}
