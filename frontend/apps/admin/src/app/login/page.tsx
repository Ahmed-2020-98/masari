"use client";

import { BrandPattern, Button, Field, Input, Logo } from "@masari/ui";
import { Lock, Phone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="grain relative grid min-h-dvh place-items-center overflow-hidden bg-navy-950 px-4">
      <BrandPattern className="pointer-events-none absolute bottom-0 end-0 w-[700px] max-w-full text-white opacity-20" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface p-8 shadow-pop">
        <Logo />
        <p className="mt-6 flex items-center gap-2 text-sm font-bold text-primary-text"><ShieldCheck className="size-4" />لوحة الإدارة</p>
        <h1 className="mt-1 text-2xl font-black">تسجيل دخول المشرفين</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError(null);
            const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
            const payload = await response.json().catch(() => ({}));
            setLoading(false);
            if (!response.ok) return setError(payload.message ?? "تعذر تسجيل الدخول");
            router.replace("/");
            router.refresh();
          }}
        >
          {error && <p role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
          <Field label="رقم الجوال" htmlFor="phone"><Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} startIcon={<Phone />} className="num" inputMode="tel" autoComplete="username" autoFocus /></Field>
          <Field label="كلمة المرور" htmlFor="password"><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} startIcon={<Lock />} autoComplete="current-password" /></Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>دخول</Button>
        </form>
      </div>
    </div>
  );
}
