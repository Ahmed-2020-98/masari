<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum TopupStatus: string
{
    use HasPresentation;

    case Pending = 'pending';
    case Paid = 'paid';
    case Failed = 'failed';
    case Rejected = 'rejected';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'قيد المراجعة',
            self::Paid => 'مكتمل',
            self::Failed => 'فشل',
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
            self::Paid => 'green',
            self::Failed => 'red',
            self::Rejected => 'rose',
        };
    }
}
