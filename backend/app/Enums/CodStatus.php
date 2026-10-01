<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum CodStatus: string
{
    use HasPresentation;

    case Pending = 'pending';
    case Collected = 'collected';
    case Credited = 'credited';
    case Cancelled = 'cancelled';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار التحصيل',
            self::Collected => 'تم التحصيل',
            self::Credited => 'أضيف للمحفظة',
            self::Cancelled => 'ملغى',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'amber',
            self::Collected => 'blue',
            self::Credited => 'green',
            self::Cancelled => 'gray',
        };
    }
}
