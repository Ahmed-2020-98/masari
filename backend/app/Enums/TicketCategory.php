<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum TicketCategory: string
{
    use HasPresentation;

    case Shipment = 'shipment';
    case Wallet = 'wallet';
    case Cod = 'cod';
    case Integration = 'integration';
    case Other = 'other';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Shipment => 'مشكلة في شحنة',
            self::Wallet => 'المحفظة والمدفوعات',
            self::Cod => 'الدفع عند الاستلام',
            self::Integration => 'الربط والتكامل',
            self::Other => 'أخرى',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Shipment => 'blue',
            self::Wallet => 'green',
            self::Cod => 'amber',
            self::Integration => 'indigo',
            self::Other => 'gray',
        };
    }
}
