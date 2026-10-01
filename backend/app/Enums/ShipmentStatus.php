<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum ShipmentStatus: string
{
    use HasPresentation;

    case Draft = 'draft';
    case Created = 'created';
    case PickupScheduled = 'pickup_scheduled';
    case PickedUp = 'picked_up';
    case InTransit = 'in_transit';
    case OutForDelivery = 'out_for_delivery';
    case Delivered = 'delivered';
    case FailedAttempt = 'failed_attempt';
    case Returned = 'returned';
    case Cancelled = 'cancelled';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Draft => 'مسودة',
            self::Created => 'تم الإنشاء',
            self::PickupScheduled => 'بانتظار الاستلام',
            self::PickedUp => 'تم الاستلام من المتجر',
            self::InTransit => 'في الطريق',
            self::OutForDelivery => 'خرج للتوصيل',
            self::Delivered => 'تم التوصيل',
            self::FailedAttempt => 'محاولة توصيل فاشلة',
            self::Returned => 'مرتجع',
            self::Cancelled => 'ملغاة',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Draft => 'gray',
            self::Created => 'blue',
            self::PickupScheduled => 'indigo',
            self::PickedUp => 'sky',
            self::InTransit => 'amber',
            self::OutForDelivery => 'orange',
            self::Delivered => 'green',
            self::FailedAttempt => 'red',
            self::Returned => 'rose',
            self::Cancelled => 'gray',
        };
    }

    /**
     * Whether the shipment can still be cancelled by the merchant.
     */
    public function isCancellable(): bool
    {
        return in_array($this, [self::Draft, self::Created, self::PickupScheduled], true);
    }

    /**
     * Whether the shipment has reached a terminal state.
     */
    public function isFinal(): bool
    {
        return in_array($this, [self::Delivered, self::Returned, self::Cancelled], true);
    }

    /**
     * Statuses that count as "active" (moving through the network).
     *
     * @return list<self>
     */
    public static function inTransitGroup(): array
    {
        return [self::PickupScheduled, self::PickedUp, self::InTransit, self::OutForDelivery, self::FailedAttempt];
    }
}
