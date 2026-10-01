<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum TopupMethod: string
{
    use HasPresentation;

    case Card = 'card';
    case BankTransfer = 'bank_transfer';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Card => 'بطاقة / مدى / Apple Pay',
            self::BankTransfer => 'تحويل بنكي',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Card => 'blue',
            self::BankTransfer => 'amber',
        };
    }
}
