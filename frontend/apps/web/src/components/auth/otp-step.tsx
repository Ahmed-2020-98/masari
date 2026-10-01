"use client";

import { api, ApiError } from "@masari/api";
import { formatPhone } from "@masari/i18n";
import { Button } from "@masari/ui";
import { useEffect, useState } from "react";
import { OtpInput } from "./otp-input";

/** Verifies an OTP already sent to `phone` and returns the verification token. */
export function OtpStep({ phone, purpose, onVerified, onBack }: { phone: string; purpose: "register" | "reset_password" | "invitation"; onVerified: (token: string) => void; onBack?: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const verify = async (value = code) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ verification_token: string }>("auth/otp/verify", { method: "POST", body: { phone, purpose, code: value } });
      onVerified(result.verification_token);
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : "تعذر التحقق من الرمز.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api("auth/otp/send", { method: "POST", body: { phone, purpose } });
      setResendIn(60);
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : "تعذر إرسال الرمز.");
    }
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); verify(); }} className="space-y-6">
      <p className="text-ink-muted">
        أرسلنا رمز تحقق مكوّن من 4 أرقام إلى <span className="num font-bold text-ink" dir="ltr">{formatPhone(phone)}</span>
        {onBack && <button type="button" onClick={onBack} className="ms-2 text-sm font-bold text-primary-text hover:underline">تعديل</button>}
      </p>
      <OtpInput
        value={code}
        invalid={!!error}
        autoFocus
        onChange={(value) => {
          setCode(value);
          if (value.length === 4) verify(value);
        }}
      />
      {error && <p role="alert" className="text-center text-sm font-medium text-rose-600">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length !== 4}>تحقق</Button>
      <p className="text-center text-sm text-ink-subtle">
        {resendIn > 0 ? <>يمكنك إعادة الإرسال بعد <span className="num">{resendIn}</span> ثانية</> : <button type="button" onClick={resend} className="font-bold text-primary-text hover:underline">إعادة إرسال الرمز</button>}
      </p>
      {process.env.NODE_ENV !== "production" && <p className="text-center text-xs text-ink-subtle">بيئة التطوير: الرمز <span className="num font-bold">1111</span></p>}
    </form>
  );
}
