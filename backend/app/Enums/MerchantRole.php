<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum MerchantRole: string
{
    use HasPresentation;

    case Owner = 'owner';
    case Manager = 'manager';
    case Operator = 'operator';
    case Accountant = 'accountant';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Owner => 'المالك',
            self::Manager => 'مدير',
            self::Operator => 'موظف شحن',
            self::Accountant => 'محاسب',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Owner => 'navy',
            self::Manager => 'green',
            self::Operator => 'blue',
            self::Accountant => 'amber',
        };
    }

    /**
     * Abilities granted to the role inside the merchant account.
     *
     * @return list<string>
     */
    public function abilities(): array
    {
        return match ($this) {
            self::Owner => ['*'],
            self::Manager => ['shipments', 'orders', 'addresses', 'pickups', 'wallet', 'cod', 'integrations', 'tickets', 'team'],
            self::Operator => ['shipments', 'orders', 'addresses', 'pickups', 'tickets'],
            self::Accountant => ['wallet', 'cod', 'invoices', 'tickets'],
        };
    }

    /**
     * Whether the role grants the given ability.
     */
    public function can(string $ability): bool
    {
        $abilities = $this->abilities();

        return in_array('*', $abilities, true) || in_array($ability, $abilities, true);
    }
}
