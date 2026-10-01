<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum TicketStatus: string
{
    use HasPresentation;

    case Open = 'open';
    case Pending = 'pending';
    case Answered = 'answered';
    case Closed = 'closed';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Open => 'مفتوحة',
            self::Pending => 'بانتظار ردك',
            self::Answered => 'تم الرد',
            self::Closed => 'مغلقة',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Open => 'green',
            self::Pending => 'amber',
            self::Answered => 'blue',
            self::Closed => 'gray',
        };
    }
}
