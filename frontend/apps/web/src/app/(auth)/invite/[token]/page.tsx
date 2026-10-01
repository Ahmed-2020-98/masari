"use client";

import { api, ApiError, type Enum } from "@masari/api";
import { Button, Field, Input, Skeleton, toast } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { OtpStep } from "@/components/auth/otp-step";

type Invitation = { store_name: string; name: string; phone: string; role: Enum; has_account: boolean };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const invitation = useQuery({ queryKey: ["invitation", token], queryFn: () => api<Invitation>(`public/invitations/${token}`), retry: false });
  const [step, setStep] = useState(0);
  const [verification, setVerification] = useState("");
  const [form, setForm] = useState({ name: "", password: "", password_confirmation: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  if (invitation.isLoading) return <Skeleton className="h-64 w-full" />;
  if (invitation.isError || !invitation.data) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-black text-ink">رابط الدعوة غير صالح</h1>
        <p className="mt-2 text-ink-muted">{invitation.error?.message}</p>
        <Button asChild className="mt-6"><Link href="/login">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  const data = invitation.data;

  const accept = async (tokenValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ message: string }>(`auth/invitations/${token}/accept`, { method: "POST", body: { verification_token: tokenValue, ...(data.has_account ? {} : { ...form, name: form.name || data.name }) } });
      toast.success(result.message);
      router.push("/login");
    } catch (exception) {
      setError(exception as ApiError);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-black text-ink">انضم إلى فريق {data.store_name}</h1>
      <p className="mt-2 text-ink-muted">تمت دعوتك بصلاحية <span className="font-bold text-ink">{data.role.label}</span>.</p>
      <div className="mt-8">
        {step === 0 && (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              try {
                await api("auth/otp/send", { method: "POST", body: { phone: data.phone, purpose: "invitation" } });
                setStep(1);
              } catch (exception) {
                setError(exception as ApiError);
              } finally {
                setLoading(false);
              }
            }}
          >
            {error && <p role="alert" className="text-sm font-medium text-rose-600">{error.message}</p>}
            {!data.has_account && (
              <>
                <Field label="الاسم" htmlFor="name"><Input id="name" value={form.name || data.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
                <Field label="كلمة المرور" htmlFor="password" required error={error?.field("password")}><Input id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required /></Field>
                <Field label="تأكيد كلمة المرور" htmlFor="password_confirmation" required><Input id="password_confirmation" type="password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} autoComplete="new-password" required /></Field>
              </>
            )}
            <Button type="submit" size="lg" className="w-full" loading={loading}>تأكيد رقم الجوال وقبول الدعوة</Button>
          </form>
        )}
        {step === 1 && <OtpStep phone={data.phone} purpose="invitation" onVerified={(value) => { setVerification(value); accept(value); }} />}
        {loading && verification && <p className="mt-4 text-center text-sm text-ink-subtle">جارٍ قبول الدعوة…</p>}
      </div>
    </>
  );
}
