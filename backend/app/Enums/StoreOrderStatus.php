<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum StoreOrderStatus: string
{
    use HasPresentation;

    case Pending = 'pending';
    case Shipped = 'shipped';
    case Ignored = 'ignored';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار الشحن',
            self::Shipped => 'تم الشحن',
            self::Ignored => 'متجاهل',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'amber',
            self::Shipped => 'green',
            self::Ignored => 'gray',
        };
    }
}
