<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum Zone: string
{
    use HasPresentation;

    case IntraCity = 'intra_city';
    case IntraRegion = 'intra_region';
    case InterRegion = 'inter_region';
    case Remote = 'remote';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::IntraCity => 'داخل المدينة',
            self::IntraRegion => 'داخل المنطقة',
            self::InterRegion => 'بين المناطق',
            self::Remote => 'مناطق نائية',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::IntraCity => 'green',
            self::IntraRegion => 'blue',
            self::InterRegion => 'amber',
            self::Remote => 'rose',
        };
    }
}
