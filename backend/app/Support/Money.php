<?php

namespace App\Support;

class Money
{
    /**
     * Present an amount stored in halalas for API consumers.
     *
     * @return array{amount: int, value: float, formatted: string}
     */
    public static function present(int $halalas): array
    {
        return [
            'amount' => $halalas,
            'value' => round($halalas / 100, 2),
            'formatted' => self::format($halalas),
        ];
    }

    /**
     * Format halalas as a human readable SAR string.
     */
    public static function format(int $halalas): string
    {
        $sign = $halalas < 0 ? '-' : '';

        return $sign.number_format(abs($halalas) / 100, 2).' ر.س';
    }

    /**
     * Convert a decimal riyal amount coming from user input into halalas.
     */
    public static function toHalalas(float|int|string $riyals): int
    {
        return (int) round(((float) $riyals) * 100);
    }
}
