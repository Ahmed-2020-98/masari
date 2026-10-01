"use client";

import { api, ApiError } from "@masari/api";
import { Button, Field, Input, NativeSelect, Stepper } from "@masari/ui";
import { Lock, Mail, Store, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OtpStep } from "@/components/auth/otp-step";
import { PhoneInput } from "@/components/auth/phone-input";

type Step = 0 | 1 | 2;

export function RegisterFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [phone, setPhone] = useState("");
  const [normalized, setNormalized] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState({ name: "", store_name: "", email: "", store_url: "", monthly_volume: "", password: "", password_confirmation: "" });

  const sendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ phone: string }>("auth/otp/send", { method: "POST", body: { phone, purpose: "register" } });
      setNormalized(result.phone);
      setStep(1);
    } catch (exception) {
      setError(exception as ApiError);
    } finally {
      setLoading(false);
    }
  };

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, email: form.email || null, store_url: form.store_url || null, monthly_volume: form.monthly_volume || null, phone: normalized, verification_token: token }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(new ApiError(payload.message ?? "تعذر إنشاء الحساب.", response.status, payload.code ?? "error", payload.errors ?? {}));
      if (payload.code === "verification_expired") setStep(0);
      return;
    }

    router.replace("/dashboard?welcome=1");
    router.refresh();
  };

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value });

  return (
    <>
      <h1 className="text-3xl font-black text-ink">أنشئ حسابك في مساري</h1>
      <p className="mt-2 text-ink-muted">ابدأ الشحن خلال دقائق، بدون عقود.</p>
      <div className="mt-6"><Stepper steps={["رقم الجوال", "التحقق", "بيانات المتجر"]} current={step} /></div>

      <div className="mt-8">
        {step === 0 && (
          <form onSubmit={sendOtp} className="space-y-5">
            <Field label="رقم الجوال" htmlFor="phone" required error={error?.message} hint="سنرسل لك رمز تحقق عبر رسالة نصية.">
              <PhoneInput id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required autoFocus aria-invalid={!!error} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading}>إرسال رمز التحقق</Button>
          </form>
        )}

        {step === 1 && <OtpStep phone={normalized} purpose="register" onBack={() => setStep(0)} onVerified={(value) => { setToken(value); setError(null); setStep(2); }} />}

        {step === 2 && (
          <form onSubmit={register} className="grid gap-4 sm:grid-cols-2" noValidate>
            {error && !Object.keys(error.errors).length && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2">{error.message}</div>}
            <Field label="الاسم الكامل" htmlFor="name" required error={error?.field("name")}><Input id="name" value={form.name} onChange={set("name")} startIcon={<User />} autoComplete="name" required /></Field>
            <Field label="اسم المتجر" htmlFor="store_name" required error={error?.field("store_name")}><Input id="store_name" value={form.store_name} onChange={set("store_name")} startIcon={<Store />} autoComplete="organization" required /></Field>
            <Field label="البريد الإلكتروني" htmlFor="email" error={error?.field("email")} className="sm:col-span-2"><Input id="email" type="email" value={form.email} onChange={set("email")} startIcon={<Mail />} autoComplete="email" /></Field>
            <Field label="رابط المتجر" htmlFor="store_url" error={error?.field("store_url")}><Input id="store_url" type="url" dir="ltr" placeholder="https://" value={form.store_url} onChange={set("store_url")} /></Field>
            <Field label="الشحنات الشهرية المتوقعة" htmlFor="monthly_volume">
              <NativeSelect id="monthly_volume" value={form.monthly_volume} onChange={set("monthly_volume")}>
                <option value="">اختر</option>
                <option value="0-100">أقل من 100</option>
                <option value="100-500">100 – 500</option>
                <option value="500-2000">500 – 2,000</option>
                <option value="2000+">أكثر من 2,000</option>
              </NativeSelect>
            </Field>
            <Field label="كلمة المرور" htmlFor="password" required error={error?.field("password")} hint="8 أحرف على الأقل تتضمن حروفاً وأرقاماً."><Input id="password" type="password" value={form.password} onChange={set("password")} startIcon={<Lock />} autoComplete="new-password" required /></Field>
            <Field label="تأكيد كلمة المرور" htmlFor="password_confirmation" required><Input id="password_confirmation" type="password" value={form.password_confirmation} onChange={set("password_confirmation")} startIcon={<Lock />} autoComplete="new-password" required /></Field>
            <p className="text-xs text-ink-subtle sm:col-span-2">بإنشاء الحساب فإنك توافق على <Link href="/terms" className="font-bold text-primary-text">الشروط والأحكام</Link> و<Link href="/privacy" className="font-bold text-primary-text">سياسة الخصوصية</Link>.</p>
            <Button type="submit" size="lg" className="w-full sm:col-span-2" loading={loading}>إنشاء الحساب</Button>
          </form>
        )}
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">لديك حساب؟ <Link href="/login" className="font-bold text-primary-text hover:underline">سجّل الدخول</Link></p>
    </>
  );
}
