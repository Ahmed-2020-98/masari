"use client";

import { Button, Field, Input } from "@masari/ui";
import { Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PhoneInput } from "@/components/auth/phone-input";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? "تعذر تسجيل الدخول.");
      return;
    }

    router.replace(next?.startsWith("/dashboard") ? next : "/dashboard");
    router.refresh();
  };

  return (
    <>
      <h1 className="text-3xl font-black text-ink">أهلاً بعودتك</h1>
      <p className="mt-2 text-ink-muted">سجّل دخولك لإدارة شحناتك.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
        <Field label="رقم الجوال" htmlFor="phone" required>
          <PhoneInput id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required autoFocus />
        </Field>
        <Field label="كلمة المرور" htmlFor="password" required>
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            startIcon={<Lock />}
            endAdornment={
              <button type="button" onClick={() => setShow((value) => !value)} className="grid size-9 place-items-center rounded-md hover:bg-surface-muted" aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            required
          />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-primary-text hover:underline">نسيت كلمة المرور؟</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>تسجيل الدخول</Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        ليس لديك حساب؟ <Link href="/register" className="font-bold text-primary-text hover:underline">أنشئ حسابك مجاناً</Link>
      </p>
    </>
  );
}
