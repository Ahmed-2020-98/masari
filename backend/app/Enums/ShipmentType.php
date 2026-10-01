<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum ShipmentType: string
{
    use HasPresentation;

    case Outbound = 'outbound';
    case Return = 'return';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Outbound => 'شحنة صادرة',
            self::Return => 'شحنة مرتجعة',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Outbound => 'blue',
            self::Return => 'rose',
        };
    }
}
