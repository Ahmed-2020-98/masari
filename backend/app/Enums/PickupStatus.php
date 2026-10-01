<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum PickupStatus: string
{
    use HasPresentation;

    case Requested = 'requested';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Requested => 'تم الطلب',
            self::Confirmed => 'مؤكد',
            self::Completed => 'تم الاستلام',
            self::Cancelled => 'ملغى',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Requested => 'amber',
            self::Confirmed => 'blue',
            self::Completed => 'green',
            self::Cancelled => 'gray',
        };
    }
}
