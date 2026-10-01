<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum WalletTransactionType: string
{
    use HasPresentation;

    case Topup = 'topup';
    case ShipmentCharge = 'shipment_charge';
    case ShipmentRefund = 'shipment_refund';
    case CodCredit = 'cod_credit';
    case CodFee = 'cod_fee';
    case ReturnFee = 'return_fee';
    case Payout = 'payout';
    case PayoutReversal = 'payout_reversal';
    case Adjustment = 'adjustment';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Topup => 'شحن رصيد',
            self::ShipmentCharge => 'رسوم شحنة',
            self::ShipmentRefund => 'استرداد شحنة',
            self::CodCredit => 'تحصيل الدفع عند الاستلام',
            self::CodFee => 'رسوم الدفع عند الاستلام',
            self::ReturnFee => 'رسوم مرتجع',
            self::Payout => 'تحويل بنكي',
            self::PayoutReversal => 'إلغاء تحويل',
            self::Adjustment => 'تسوية إدارية',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Topup => 'green',
            self::ShipmentCharge => 'rose',
            self::ShipmentRefund => 'blue',
            self::CodCredit => 'green',
            self::CodFee => 'rose',
            self::ReturnFee => 'rose',
            self::Payout => 'amber',
            self::PayoutReversal => 'blue',
            self::Adjustment => 'gray',
        };
    }
}
