<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum PayoutStatus: string
{
    use HasPresentation;

    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'قيد المراجعة',
            self::Approved => 'تم التحويل',
            self::Rejected => 'مرفوض',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'amber',
            self::Approved => 'green',
            self::Rejected => 'rose',
        };
    }
}
