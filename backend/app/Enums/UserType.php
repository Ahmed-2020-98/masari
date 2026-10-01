<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum UserType: string
{
    use HasPresentation;

    case Merchant = 'merchant';
    case Admin = 'admin';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Merchant => 'تاجر',
            self::Admin => 'مشرف',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Merchant => 'blue',
            self::Admin => 'navy',
        };
    }
}
