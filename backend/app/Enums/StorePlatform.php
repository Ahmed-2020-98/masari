<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum StorePlatform: string
{
    use HasPresentation;

    case Salla = 'salla';
    case Zid = 'zid';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Salla => 'سلة',
            self::Zid => 'زد',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Salla => 'green',
            self::Zid => 'indigo',
        };
    }
}
