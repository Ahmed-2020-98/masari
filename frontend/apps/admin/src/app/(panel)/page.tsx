"use client";

import { api, type Enum, type Money as MoneyValue } from "@masari/api";
import { formatShortDate } from "@masari/i18n";
import { Card, CardHeader, KpiCard, Money, PageHeader, Segmented, Skeleton } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, CreditCard, Headset, PiggyBank, Store, TrendingUp, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Dashboard = {
  kpis: { shipments: number; gmv: MoneyValue; revenue: MoneyValue; margin: MoneyValue; merchants: number; new_merchants: number; wallets_total: MoneyValue; cod_to_settle: MoneyValue; delivery_rate: number | null };
  queues: { topups: number; payouts: number; tickets: number; failed_attempts: number };
  chart: { date: string; shipments: number; margin: number }[];
  carriers: { name: string; color: string | null; total: number; margin: MoneyValue }[];
  statuses: (Enum & { total: number })[];
  top_merchants: { id: number; store_name: string; shipments: number; gmv: MoneyValue }[];
};

export default function AdminDashboard() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard", Number(days)], queryFn: () => api<Dashboard>("admin/dashboard", { query: { days } }) });
  const kpis = data?.kpis;
  const queues = [
    { key: "topups", label: "طلبات شحن رصيد", href: "/finance/topups", icon: CreditCard },
    { key: "payouts", label: "طلبات تحويل بنكي", href: "/finance/payouts", icon: Wallet },
    { key: "tickets", label: "تذاكر مفتوحة", href: "/tickets", icon: Headset },
    { key: "failed_attempts", label: "محاولات توصيل فاشلة", href: "/shipments?status=failed_attempt", icon: AlertTriangle },
  ] as const;
  const statusTotal = Math.max(1, data?.statuses.reduce((sum, status) => sum + status.total, 0) ?? 1);

  return (
    <>
      <PageHeader title="نظرة عامة" description="أداء المنصة والعمليات المعلقة." actions={<Segmented value={days} onChange={setDays} options={[{ value: "7", label: "7 أيام" }, { value: "30", label: "30 يوماً" }, { value: "90", label: "90 يوماً" }]} />} />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {queues.map((queue) => (
          <Link key={queue.key} href={queue.href} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 transition hover:border-navy-900 hover:shadow-card">
            <span className="grid size-10 place-items-center rounded-md bg-navy-900 text-green-400"><queue.icon className="size-5" aria-hidden /></span>
            <div><p className="num text-2xl font-extrabold">{isLoading ? "…" : data?.queues[queue.key]}</p><p className="text-xs text-ink-subtle">{queue.label}</p></div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="الشحنات" value={kpis?.shipments.toLocaleString("en-US")} icon={<Truck />} tone="navy" loading={isLoading} hint={kpis?.delivery_rate != null && <>نسبة التوصيل <span className="num font-bold">{kpis.delivery_rate}%</span></>} />
        <KpiCard label="إجمالي المبيعات (GMV)" value={<Money value={kpis?.gmv} />} icon={<TrendingUp />} tone="blue" loading={isLoading} />
        <KpiCard label="هامش الربح" value={<Money value={kpis?.margin} />} icon={<PiggyBank />} tone="green" loading={isLoading} hint={kpis && <>إيراد قبل الضريبة <Money value={kpis.revenue} /></>} />
        <KpiCard label="التجار" value={kpis?.merchants} icon={<Store />} tone="indigo" loading={isLoading} hint={kpis && <><span className="num">+{kpis.new_merchants}</span> جديد</>} />
        <KpiCard label="أرصدة المحافظ" value={<Money value={kpis?.wallets_total} />} icon={<Wallet />} tone="amber" loading={isLoading} />
        <KpiCard label="تحصيل بانتظار التسوية" value={<Money value={kpis?.cod_to_settle} />} icon={<Banknote />} tone="rose" loading={isLoading} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="الشحنات والهامش اليومي" />
          <div className="h-80 p-4" dir="ltr">
            {isLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data?.chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis reversed dataKey="date" tickFormatter={(value) => formatShortDate(value)} tick={{ fontSize: 11, fill: "var(--ink-subtle)" }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis yAxisId="s" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-subtle)" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="m" orientation="left" tick={{ fontSize: 11, fill: "var(--ink-subtle)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", direction: "rtl" }} labelFormatter={(value) => formatShortDate(String(value))} formatter={(value, name) => [value, name === "shipments" ? "الشحنات" : "الهامش (ر.س)"]} />
                  <Bar yAxisId="s" dataKey="shipments" fill="#0F2741" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="m" dataKey="margin" stroke="#00C48C" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="توزيع الحالات" />
          <ul className="space-y-3 p-5">
            {data?.statuses.map((status) => (
              <li key={status.value}>
                <div className="mb-1 flex justify-between text-sm"><span>{status.label}</span><span className="num text-ink-subtle">{status.total}</span></div>
                <div className="h-2 rounded-full bg-surface-muted"><div className="h-full rounded-full bg-navy-900" style={{ width: `${(status.total / statusTotal) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="أداء شركات الشحن" />
          <table className="w-full text-sm">
            <thead><tr className="text-start text-xs text-ink-subtle"><th className="px-5 py-2 text-start font-bold">الشركة</th><th className="px-5 py-2 text-start font-bold">الشحنات</th><th className="px-5 py-2 text-start font-bold">الهامش</th></tr></thead>
            <tbody>
              {data?.carriers.map((carrier) => (
                <tr key={carrier.name} className="border-t border-line">
                  <td className="px-5 py-3"><span className="me-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: carrier.color ?? "#0F2741" }} />{carrier.name}</td>
                  <td className="num px-5 py-3">{carrier.total}</td>
                  <td className="px-5 py-3"><Money value={carrier.margin} className="font-bold text-green-700" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="أعلى التجار" />
          <ul className="divide-y divide-line">
            {data?.top_merchants.map((merchant, index) => (
              <li key={merchant.id}>
                <Link href={`/merchants/${merchant.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted">
                  <span className="num grid size-7 place-items-center rounded-full bg-surface-muted text-xs font-bold">{index + 1}</span>
                  <span className="flex-1 font-medium">{merchant.store_name}</span>
                  <span className="num text-sm text-ink-subtle">{merchant.shipments} شحنة</span>
                  <Money value={merchant.gmv} className="font-bold" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
