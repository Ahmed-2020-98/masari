"use client";

import { api, ApiError, type Carrier, type Enum, type Merchant, type Money as MoneyValue, type Plan, type WalletTransaction } from "@masari/api";
import { formatDateTime, formatPhone } from "@masari/i18n";
import {
  Button, Card, CardHeader, Dialog, DialogContent, DialogFooter, EnumBadge, Field, Input, KpiCard, Money, NativeSelect, PageHeader, Segmented, Skeleton, toast,
} from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Ban, CheckCircle2, Plus, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

type Detail = {
  merchant: Merchant;
  stats: { shipments: number; delivered: number; returned: number; spent: MoneyValue; credit_limit: MoneyValue };
  team: { id: number; name: string; phone: string; role: Enum; last_login_at: string | null }[];
  overrides: { id: number; carrier_service_id: number; service: string; markup_type: "percent" | "fixed"; markup_value: number }[];
  transactions: WalletTransaction[];
};

export default function MerchantDetail() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-merchant", id], queryFn: () => api<Detail>(`admin/merchants/${id}`) });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api<{ data: Plan[] }>("admin/plans") });
  const carriers = useQuery({ queryKey: ["admin-carriers"], queryFn: () => api<{ data: Carrier[] }>("admin/carriers") });
  const [walletOpen, setWalletOpen] = useState(false);
  const [adjust, setAdjust] = useState({ direction: "credit" as "credit" | "debit", amount: "", reason: "" });
  const [override, setOverride] = useState({ carrier_service_id: "", markup_type: "fixed", markup_value: "" });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin-merchant", id] });

  const update = useMutation({ mutationFn: (body: Record<string, unknown>) => api(`admin/merchants/${id}`, { method: "PATCH", body }), onSuccess: () => { toast.success("تم التحديث"); refresh(); }, onError: (error: ApiError) => toast.error(error.message) });
  const wallet = useMutation({
    mutationFn: () => api(`admin/merchants/${id}/wallet`, { method: "POST", body: { ...adjust, amount: Number(adjust.amount) } }),
    onSuccess: () => { toast.success("تمت التسوية"); setWalletOpen(false); setAdjust({ direction: "credit", amount: "", reason: "" }); refresh(); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const saveOverride = useMutation({
    mutationFn: () => api(`admin/merchants/${id}/overrides`, { method: "POST", body: { carrier_service_id: Number(override.carrier_service_id), markup_type: override.markup_type, markup_value: Number(override.markup_value) } }),
    onSuccess: () => { toast.success("تم حفظ السعر الخاص"); setOverride({ carrier_service_id: "", markup_type: "fixed", markup_value: "" }); refresh(); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const deleteOverride = useMutation({ mutationFn: (overrideId: number) => api(`admin/merchants/${id}/overrides/${overrideId}`, { method: "DELETE" }), onSuccess: refresh });

  if (isLoading || !data) return <Skeleton className="h-96" />;
  const merchant = data.merchant;

  return (
    <>
      <Link href="/merchants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink"><ArrowRight className="size-4" />التجار</Link>
      <PageHeader
        title={merchant.store_name}
        eyebrow={`#${merchant.id} · ${merchant.name}`}
        description={<span className="num" dir="ltr">{formatPhone(merchant.phone)}</span>}
        actions={
          <>
            <EnumBadge value={merchant.status} />
            {merchant.status.value === "suspended" ? (
              <Button variant="soft" onClick={() => update.mutate({ status: "active" })}><CheckCircle2 />تفعيل</Button>
            ) : (
              <Button variant="danger-soft" onClick={() => update.mutate({ status: "suspended" })}><Ban />إيقاف الحساب</Button>
            )}
            <Button onClick={() => setWalletOpen(true)}><Wallet />تسوية المحفظة</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard label="الرصيد" value={<Money value={merchant.wallet_balance} />} tone="green" />
        <KpiCard label="الشحنات" value={data.stats.shipments} tone="navy" />
        <KpiCard label="تم التوصيل" value={data.stats.delivered} tone="blue" />
        <KpiCard label="مرتجعات" value={data.stats.returned} tone="rose" />
        <KpiCard label="إجمالي الإنفاق" value={<Money value={data.stats.spent} />} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="الباقة والائتمان" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="الباقة" htmlFor="m-plan">
              <NativeSelect id="m-plan" value={merchant.plan?.id ?? ""} onChange={(event) => update.mutate({ plan_id: Number(event.target.value) || null })}>
                {plans.data?.data.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="حد الائتمان (سالب مسموح)" htmlFor="m-credit" hint={<>الحالي: <Money value={data.stats.credit_limit} /></>}>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("credit"); update.mutate({ credit_limit: Number(value) }); }}>
                <Input id="m-credit" name="credit" type="number" min="0" defaultValue={data.stats.credit_limit.value} className="num" />
                <Button type="submit" variant="outline">حفظ</Button>
              </form>
            </Field>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:col-span-2">
              <div><dt className="text-ink-subtle">السجل التجاري</dt><dd className="num">{merchant.commercial_registration ?? "—"}</dd></div>
              <div><dt className="text-ink-subtle">الرقم الضريبي</dt><dd className="num">{merchant.vat_number ?? "—"}</dd></div>
              <div className="col-span-2"><dt className="text-ink-subtle">الحساب البنكي</dt><dd className="num" dir="ltr" style={{ textAlign: "right" }}>{merchant.iban ?? "—"}</dd></div>
            </dl>
          </div>
        </Card>
        <Card>
          <CardHeader title="أسعار خاصة" description="تتجاوز هامش الباقة لخدمة محددة. القيمة الثابتة بالهللة، والنسبة بالنقطة الأساسية (1000 = 10%)." />
          <div className="p-5">
            <form className="grid gap-2 sm:grid-cols-[1fr_120px_110px_auto]" onSubmit={(event) => { event.preventDefault(); saveOverride.mutate(); }}>
              <NativeSelect value={override.carrier_service_id} onChange={(event) => setOverride({ ...override, carrier_service_id: event.target.value })} aria-label="الخدمة">
                <option value="">الخدمة</option>
                {carriers.data?.data.flatMap((carrier) => carrier.services?.map((service) => <option key={service.id} value={service.id}>{carrier.name} — {service.name}</option>) ?? [])}
              </NativeSelect>
              <NativeSelect value={override.markup_type} onChange={(event) => setOverride({ ...override, markup_type: event.target.value })} aria-label="النوع"><option value="fixed">مبلغ ثابت</option><option value="percent">نسبة</option></NativeSelect>
              <Input type="number" min="0" value={override.markup_value} onChange={(event) => setOverride({ ...override, markup_value: event.target.value })} className="num" aria-label="القيمة" />
              <Button type="submit" size="icon" loading={saveOverride.isPending} disabled={!override.carrier_service_id || override.markup_value === ""} aria-label="إضافة"><Plus /></Button>
            </form>
            <ul className="mt-4 divide-y divide-line">
              {data.overrides.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex-1">{item.service}</span>
                  <span className="num font-bold">{item.markup_type === "percent" ? `${item.markup_value / 100}%` : `${(item.markup_value / 100).toFixed(2)} ر.س`}</span>
                  <Button size="icon-sm" variant="ghost" onClick={() => deleteOverride.mutate(item.id)} aria-label="حذف"><Trash2 /></Button>
                </li>
              ))}
              {data.overrides.length === 0 && <li className="py-4 text-center text-sm text-ink-subtle">لا توجد أسعار خاصة.</li>}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader title="فريق العمل" />
          <ul className="divide-y divide-line">
            {data.team.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium">{member.name}</span>
                <span className="num text-ink-subtle">{formatPhone(member.phone)}</span>
                <EnumBadge value={member.role} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="آخر حركات المحفظة" action={<Button asChild size="sm" variant="ghost"><Link href={`/shipments?merchant=${merchant.id}`}>شحنات التاجر</Link></Button>} />
          <ul className="divide-y divide-line">
            {data.transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <EnumBadge value={transaction.type} />
                <span className="min-w-0 flex-1 truncate text-ink-muted">{transaction.description}</span>
                <Money value={transaction.amount} signed className="font-bold" />
                <span className="num hidden text-xs text-ink-subtle md:inline">{formatDateTime(transaction.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent title="تسوية يدوية للمحفظة" description="تُسجَّل العملية في سجل النشاط مع اسمك.">
          <Segmented value={adjust.direction} onChange={(value) => setAdjust({ ...adjust, direction: value })} options={[{ value: "credit", label: "إضافة رصيد" }, { value: "debit", label: "خصم رصيد" }]} />
          <div className="mt-4 space-y-4">
            <Field label="المبلغ" htmlFor="adj-amount"><Input id="adj-amount" type="number" min="0.01" step="0.01" value={adjust.amount} onChange={(event) => setAdjust({ ...adjust, amount: event.target.value })} endAdornment="ر.س" className="num" /></Field>
            <Field label="السبب" htmlFor="adj-reason" required><Input id="adj-reason" value={adjust.reason} onChange={(event) => setAdjust({ ...adjust, reason: event.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletOpen(false)}>إلغاء</Button>
            <Button variant={adjust.direction === "debit" ? "danger" : "primary"} onClick={() => wallet.mutate()} loading={wallet.isPending} disabled={!Number(adjust.amount) || !adjust.reason}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
