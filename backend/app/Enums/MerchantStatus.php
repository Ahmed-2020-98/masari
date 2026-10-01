<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum MerchantStatus: string
{
    use HasPresentation;

    case Pending = 'pending';
    case Active = 'active';
    case Suspended = 'suspended';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار التفعيل',
            self::Active => 'نشط',
            self::Suspended => 'موقوف',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'amber',
            self::Active => 'green',
            self::Suspended => 'rose',
        };
    }
}
