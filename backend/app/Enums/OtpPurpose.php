<?php

namespace App\Enums;

use App\Enums\Concerns\HasPresentation;

enum OtpPurpose: string
{
    use HasPresentation;

    case Register = 'register';
    case ResetPassword = 'reset_password';
    case Invitation = 'invitation';

    /**
     * Arabic label shown to users.
     */
    public function label(): string
    {
        return match ($this) {
            self::Register => 'تسجيل حساب',
            self::ResetPassword => 'استعادة كلمة المرور',
            self::Invitation => 'دعوة فريق',
        };
    }

    /**
     * Semantic color token used by every client (web, admin, Flutter).
     */
    public function color(): string
    {
        return match ($this) {
            self::Register => 'blue',
            self::ResetPassword => 'amber',
            self::Invitation => 'green',
        };
    }
}
