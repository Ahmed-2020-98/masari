<?php

namespace App\Services\Auth;

use App\Enums\OtpPurpose;
use App\Exceptions\DomainException;
use App\Models\OtpCode;
use App\Services\Sms\SmsSender;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OtpService
{
    public function __construct(private SmsSender $sms) {}

    /**
     * Generate and send a one-time code to the phone number.
     */
    public function send(string $phone, OtpPurpose $purpose): OtpCode
    {
        $latest = OtpCode::query()
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->latest('id')
            ->first();

        $resendSeconds = config('masari.otp.resend_seconds');

        if ($latest && $latest->created_at->diffInSeconds(now()) < $resendSeconds) {
            throw new DomainException('يرجى الانتظار قبل طلب رمز جديد.', 'otp_throttled', 429);
        }

        $code = app()->isProduction()
            ? (string) random_int(10 ** (config('masari.otp.length') - 1), 10 ** config('masari.otp.length') - 1)
            : str_repeat('1', config('masari.otp.length'));

        $otp = OtpCode::create([
            'phone' => $phone,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(config('masari.otp.ttl_minutes')),
        ]);

        $this->sms->send($phone, "رمز التحقق الخاص بك في مساري: {$code}");

        return $otp;
    }

    /**
     * Verify a code and return a short-lived verification token proving phone ownership.
     */
    public function verify(string $phone, OtpPurpose $purpose, string $code): string
    {
        $otp = OtpCode::query()
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->latest('id')
            ->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw new DomainException('انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد.', 'otp_expired');
        }

        if ($otp->attempts >= config('masari.otp.max_attempts')) {
            throw new DomainException('تم تجاوز عدد المحاولات المسموح بها.', 'otp_locked', 429);
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            throw new DomainException('رمز التحقق غير صحيح.', 'otp_invalid');
        }

        $token = Str::random(48);

        $otp->update(['verified_at' => now(), 'verification_token' => $token]);

        return $token;
    }

    /**
     * Consume a verification token issued by verify(), ensuring it matches the phone and purpose.
     */
    public function consume(string $token, string $phone, OtpPurpose $purpose): void
    {
        $otp = OtpCode::query()
            ->where('verification_token', $token)
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->where('verified_at', '>=', now()->subMinutes(30))
            ->first();

        if (! $otp) {
            throw new DomainException('انتهت صلاحية التحقق من رقم الجوال، يرجى إعادة المحاولة.', 'verification_expired');
        }

        $otp->update(['verification_token' => null]);
    }
}
