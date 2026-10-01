"use client";

import { api, ApiError, type Merchant } from "@masari/api";
import { formatRelative } from "@masari/i18n";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCan, useRefreshSession, useSession } from "@/lib/session";

function ProfileForm() {
  const session = useSession();
  const refresh = useRefreshSession();
  const [form, setForm] = useState({ name: session.user.name, email: session.user.email ?? "" });
  const save = useMutation({ mutationFn: () => api("me", { method: "PUT", body: { ...form, email: form.email || null } }), onSuccess: () => { toast.success("تم الحفظ"); refresh(); } });
  const error = save.error instanceof ApiError ? save.error : null;

  return (
    <Card>
      <CardHeader title="الملف الشخصي" />
      <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Field label="الاسم" htmlFor="u-name" error={error?.field("name")}><Input id="u-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="البريد الإلكتروني" htmlFor="u-email" error={error?.field("email")}><Input id="u-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="رقم الجوال" htmlFor="u-phone" hint="لتغيير رقم الجوال تواصل مع الدعم."><Input id="u-phone" value={session.user.phone} disabled dir="ltr" className="num text-end" /></Field>
        <div className="flex items-end justify-end"><Button type="submit" loading={save.isPending}>حفظ</Button></div>
      </form>
    </Card>
  );
}

function MerchantForm({ merchant, section }: { merchant: Merchant; section: "store" | "bank" }) {
  const client = useQueryClient();
  const refresh = useRefreshSession();
  const can = useCan();
  const [form, setForm] = useState({
    store_name: merchant.store_name, store_url: merchant.store_url ?? "", email: merchant.email ?? "", commercial_registration: merchant.commercial_registration ?? "", vat_number: merchant.vat_number ?? "",
    iban: merchant.iban ?? "", bank_name: merchant.bank_name ?? "", account_holder: merchant.account_holder ?? "",
  });
  const save = useMutation({
    mutationFn: () => api("merchant/settings", { method: "PUT", body: Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || null])) }),
    onSuccess: () => { toast.success("تم حفظ البيانات"); client.invalidateQueries({ queryKey: ["merchant-settings"] }); refresh(); },
  });
  const error = save.error instanceof ApiError ? save.error : null;
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  const readOnly = !can("team");

  return (
    <Card>
      <CardHeader title={section === "store" ? "بيانات المتجر" : "الحساب البنكي"} description={section === "bank" ? "تُحوَّل مبالغ التحصيل وطلبات التحويل إلى هذا الحساب." : undefined} />
      <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        {section === "store" ? (
          <>
            <Field label="اسم المتجر" htmlFor="m-name" required error={error?.field("store_name")}><Input id="m-name" value={form.store_name} onChange={set("store_name")} disabled={readOnly} /></Field>
            <Field label="رابط المتجر" htmlFor="m-url" error={error?.field("store_url")}><Input id="m-url" type="url" dir="ltr" value={form.store_url} onChange={set("store_url")} disabled={readOnly} /></Field>
            <Field label="البريد الإلكتروني" htmlFor="m-email" error={error?.field("email")}><Input id="m-email" type="email" value={form.email} onChange={set("email")} disabled={readOnly} /></Field>
            <Field label="السجل التجاري" htmlFor="m-cr" error={error?.field("commercial_registration")}><Input id="m-cr" value={form.commercial_registration} onChange={set("commercial_registration")} className="num" inputMode="numeric" disabled={readOnly} /></Field>
            <Field label="الرقم الضريبي" htmlFor="m-vat" hint="يظهر في الفواتير الضريبية." error={error?.field("vat_number")}><Input id="m-vat" value={form.vat_number} onChange={set("vat_number")} className="num" inputMode="numeric" disabled={readOnly} /></Field>
          </>
        ) : (
          <>
            <Field label="اسم صاحب الحساب" htmlFor="b-holder" error={error?.field("account_holder")}><Input id="b-holder" value={form.account_holder} onChange={set("account_holder")} disabled={readOnly} /></Field>
            <Field label="البنك" htmlFor="b-bank"><Input id="b-bank" value={form.bank_name} onChange={set("bank_name")} disabled={readOnly} /></Field>
            <Field label="رقم الآيبان" htmlFor="b-iban" error={error?.field("iban")} className="sm:col-span-2"><Input id="b-iban" value={form.iban} onChange={set("iban")} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" className="num uppercase" disabled={readOnly} /></Field>
          </>
        )}
        {!readOnly && <div className="flex justify-end sm:col-span-2"><Button type="submit" loading={save.isPending}>حفظ</Button></div>}
      </form>
    </Card>
  );
}

function SecurityTab() {
  const client = useQueryClient();
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api<{ data: { id: number; name: string; is_current: boolean; last_used_at: string | null }[] }>("me/sessions") });
  const change = useMutation({
    mutationFn: () => api("me/password", { method: "PUT", body: form }),
    onSuccess: () => { toast.success("تم تحديث كلمة المرور وتسجيل الخروج من الأجهزة الأخرى."); setForm({ current_password: "", password: "", password_confirmation: "" }); client.invalidateQueries({ queryKey: ["sessions"] }); },
  });
  const revoke = useMutation({ mutationFn: (id: number) => api(`me/sessions/${id}`, { method: "DELETE" }), onSuccess: () => client.invalidateQueries({ queryKey: ["sessions"] }) });
  const error = change.error instanceof ApiError ? change.error : null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="تغيير كلمة المرور" />
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); change.mutate(); }}>
          <Field label="كلمة المرور الحالية" htmlFor="p-current" error={error?.field("current_password")}><Input id="p-current" type="password" autoComplete="current-password" value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} /></Field>
          <Field label="كلمة المرور الجديدة" htmlFor="p-new" error={error?.field("password")}><Input id="p-new" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
          <Field label="تأكيد كلمة المرور" htmlFor="p-confirm"><Input id="p-confirm" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /></Field>
          <div className="flex justify-end"><Button type="submit" loading={change.isPending}>تحديث</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="الأجهزة المتصلة" description="تطبيق الجوال والمتصفحات التي سجلت الدخول بحسابك." />
        <ul className="divide-y divide-line">
          {sessions.data?.data.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              {/ios|android/i.test(item.name) ? <Smartphone className="size-5 text-ink-subtle" aria-hidden /> : <Laptop className="size-5 text-ink-subtle" aria-hidden />}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-ink-subtle">{item.last_used_at ? formatRelative(item.last_used_at) : "—"}</p></div>
              {item.is_current ? <Badge tone="green">هذا الجهاز</Badge> : <Button size="sm" variant="ghost" onClick={() => revoke.mutate(item.id)}>إنهاء</Button>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SettingsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "profile";
  const setTab = (value: string) => router.replace(`/dashboard/settings?tab=${value}`, { scroll: false });
  const merchant = useQuery({ queryKey: ["merchant-settings"], queryFn: () => api<{ data: Merchant }>("merchant/settings") });

  return (
    <>
      <PageHeader title="الإعدادات" description={merchant.data ? `باقتك الحالية: ${merchant.data.data.plan?.name ?? "—"}` : undefined} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          <TabsTrigger value="store">المتجر</TabsTrigger>
          <TabsTrigger value="bank">الحساب البنكي</TabsTrigger>
          <TabsTrigger value="security">الأمان</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileForm /></TabsContent>
        <TabsContent value="store">{merchant.data && <MerchantForm merchant={merchant.data.data} section="store" />}</TabsContent>
        <TabsContent value="bank">{merchant.data && <MerchantForm merchant={merchant.data.data} section="bank" />}</TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
      </Tabs>
    </>
  );
}

export default function Page() {
  return <Suspense><SettingsPage /></Suspense>;
}
