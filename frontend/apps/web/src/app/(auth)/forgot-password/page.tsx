"use client";

import { api, ApiError } from "@masari/api";
import { Button, Field, Input, toast } from "@masari/ui";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OtpStep } from "@/components/auth/otp-step";
import { PhoneInput } from "@/components/auth/phone-input";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [normalized, setNormalized] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (exception) {
      setError(exception as ApiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-black text-ink">استعادة كلمة المرور</h1>
      <p className="mt-2 text-ink-muted">سنرسل رمز تحقق إلى جوالك المسجل.</p>
      <div className="mt-8">
        {step === 0 && (
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); run(async () => { const result = await api<{ phone: string }>("auth/otp/send", { method: "POST", body: { phone, purpose: "reset_password" } }); setNormalized(result.phone); setStep(1); }); }}>
            <Field label="رقم الجوال" htmlFor="phone" required error={error?.message}><PhoneInput id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required autoFocus /></Field>
            <Button type="submit" size="lg" className="w-full" loading={loading}>إرسال الرمز</Button>
          </form>
        )}
        {step === 1 && <OtpStep phone={normalized} purpose="reset_password" onBack={() => setStep(0)} onVerified={(value) => { setToken(value); setStep(2); }} />}
        {step === 2 && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                const result = await api<{ message: string }>("auth/password/reset", { method: "POST", body: { phone: normalized, verification_token: token, password, password_confirmation: confirmation } });
                toast.success(result.message);
                router.push("/login");
              });
            }}
          >
            <Field label="كلمة المرور الجديدة" htmlFor="password" required error={error?.field("password") ?? (error && !Object.keys(error.errors).length ? error.message : undefined)} hint="8 أحرف على الأقل تتضمن حروفاً وأرقاماً.">
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} startIcon={<Lock />} autoComplete="new-password" required />
            </Field>
            <Field label="تأكيد كلمة المرور" htmlFor="confirmation" required>
              <Input id="confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} startIcon={<Lock />} autoComplete="new-password" required />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading}>حفظ كلمة المرور</Button>
          </form>
        )}
      </div>
      <p className="mt-8 text-center text-sm text-ink-muted"><Link href="/login" className="font-bold text-primary-text hover:underline">العودة لتسجيل الدخول</Link></p>
    </>
  );
}
