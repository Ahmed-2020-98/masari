"use client";

import { api, type Money as MoneyValue, type Shipment } from "@masari/api";
import { formatShortDate } from "@masari/i18n";
import { Button, Card, CardHeader, DataTable, EmptyState, KpiCard, Money, PageHeader, Skeleton } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, CheckCircle2, Clock, PackageCheck, PackagePlus, RotateCcw, ShoppingBag, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shipmentColumns } from "@/components/dashboard/shipment-bits";
import { useCan, useSession } from "@/lib/session";

type Dashboard = {
  kpis: {
    total: number; delivered: number; in_transit: number; awaiting_pickup: number; returned: number; cancelled: number; delivery_rate: number | null;
    wallet: MoneyValue; cod_pending: MoneyValue; cod_collected: MoneyValue; spent_30d: MoneyValue; pending_orders: number;
  };
  chart: { date: string; total: number; delivered: number }[];
  carriers: { name: string; color: string | null; total: number }[];
  latest: { data: Shipment[] } | Shipment[];
};

function Welcome() {
  const welcome = useSearchParams().get("welcome");
  if (!welcome) return null;
  return (
    <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-green-200 bg-green-50 p-5">
      <div>
        <p className="text-lg font-extrabold text-navy-900">مرحباً بك في مساري!</p>
        <p className="text-sm text-navy-900/70">ابدأ بإضافة عنوان المستودع ثم اشحن رصيد محفظتك لإنشاء أول شحنة.</p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline"><Link href="/dashboard/addresses">إضافة عنوان</Link></Button>
        <Button asChild variant="navy"><Link href="/dashboard/wallet">شحن المحفظة</Link></Button>
      </div>
    </Card>
  );
}

export default function DashboardHome() {
  const session = useSession();
  const can = useCan();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("merchant/dashboard") });
  const kpis = data?.kpis;
  const latest = data ? (Array.isArray(data.latest) ? data.latest : data.latest.data) : undefined;
  const maxCarrier = Math.max(1, ...(data?.carriers.map((carrier) => carrier.total) ?? [1]));

  return (
    <>
      <Suspense><Welcome /></Suspense>
      <PageHeader
        eyebrow={session.merchant?.store_name}
        title={`مرحباً، ${session.user.name.split(" ")[0]}`}
        description="نظرة عامة على شحناتك خلال آخر 30 يوماً."
        actions={can("shipments") && <Button asChild><Link href="/dashboard/shipments/new"><PackagePlus />إنشاء شحنة</Link></Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard label="إجمالي الشحنات" value={kpis?.total.toLocaleString("en-US")} icon={<Truck />} tone="navy" loading={isLoading} />
        <KpiCard label="تم التوصيل" value={kpis?.delivered.toLocaleString("en-US")} icon={<CheckCircle2 />} tone="green" loading={isLoading} hint={kpis?.delivery_rate != null && <>نسبة النجاح <span className="num font-bold text-green-700">{kpis.delivery_rate}%</span></>} />
        <KpiCard label="في الطريق" value={kpis?.in_transit.toLocaleString("en-US")} icon={<Clock />} tone="amber" loading={isLoading} hint={kpis && <><span className="num">{kpis.awaiting_pickup}</span> بانتظار الاستلام</>} />
        <KpiCard label="مرتجعات" value={kpis?.returned.toLocaleString("en-US")} icon={<RotateCcw />} tone="rose" loading={isLoading} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="حركة الشحنات" description="آخر 30 يوماً" />
          <div className="h-72 px-2 pb-4 pt-4" dir="ltr">
            {isLoading ? (
              <Skeleton className="mx-4 h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chart} margin={{ top: 8, right: -16, left: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F2741" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0F2741" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-delivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C48C" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00C48C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis reversed dataKey="date" tickFormatter={(value) => formatShortDate(value)} tick={{ fontSize: 11, fill: "var(--ink-subtle)" }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-subtle)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontFamily: "var(--font-sans)", direction: "rtl" }}
                    labelFormatter={(value) => formatShortDate(String(value))}
                    formatter={(value, name) => [value, name === "total" ? "الشحنات" : "تم التوصيل"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0F2741" strokeWidth={2} fill="url(#g-total)" />
                  <Area type="monotone" dataKey="delivered" stroke="#00C48C" strokeWidth={2} fill="url(#g-delivered)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          {can("wallet") && (
            <Card className="grain relative overflow-hidden border-0 bg-navy-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">رصيد المحفظة</p>
                <Wallet className="size-5 text-green-400" aria-hidden />
              </div>
              {isLoading ? <Skeleton className="mt-2 h-9 w-40 bg-white/10" /> : <Money value={kpis?.wallet} className="mt-2 block text-3xl font-extrabold" />}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-white/55">تحصيل قيد التوريد</p><Money value={kpis?.cod_pending} className="font-bold" /></div>
                <div><p className="text-white/55">الإنفاق (30 يوم)</p><Money value={kpis?.spent_30d} className="font-bold" /></div>
              </div>
              <Button asChild size="sm" className="mt-5 w-full"><Link href="/dashboard/wallet">شحن الرصيد</Link></Button>
            </Card>
          )}
          <Card>
            <CardHeader title="توزيع شركات الشحن" />
            <div className="space-y-3 p-5">
              {isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-6" />)}
              {data?.carriers.length === 0 && <p className="py-4 text-center text-sm text-ink-subtle">لا توجد شحنات بعد</p>}
              {data?.carriers.slice(0, 6).map((carrier) => (
                <div key={carrier.name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{carrier.name}</span><span className="num text-ink-subtle">{carrier.total}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(carrier.total / maxCarrier) * 100}%`, backgroundColor: carrier.color ?? "#0F2741" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {!!kpis?.pending_orders && can("orders") && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-amber-50 text-amber-600"><ShoppingBag className="size-5" aria-hidden /></span>
            <p className="font-bold">لديك <span className="num">{kpis.pending_orders}</span> طلبات من متجرك بانتظار الشحن</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/orders">عرض الطلبات<ArrowLeft /></Link></Button>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="أحدث الشحنات" action={<Button asChild variant="ghost" size="sm"><Link href="/dashboard/shipments">عرض الكل<ArrowLeft /></Link></Button>} />
        <DataTable
          columns={shipmentColumns}
          rows={latest}
          loading={isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
          empty={<EmptyState icon={<PackageCheck />} title="لا توجد شحنات بعد" description="أنشئ أول شحنة وقارن أسعار جميع الشركات." action={<Button asChild><Link href="/dashboard/shipments/new">إنشاء شحنة</Link></Button>} />}
        />
      </Card>

      {can("cod") && kpis && kpis.cod_collected.amount > 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted"><Banknote className="size-4 text-green-600" aria-hidden />تم تحصيل <Money value={kpis.cod_collected} className="font-bold text-ink" /> من العملاء وبانتظار التوريد إلى محفظتك.</p>
      )}
    </>
  );
}
