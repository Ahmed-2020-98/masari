"use client";

import { api, fileUrl, openBinary, type Carrier, type Shipment } from "@masari/api";
import {
  Button, Card, DataTable, EmptyState, Input, NativeSelect, PageHeader, Pagination, toast,
} from "@masari/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, PackagePlus, Printer, Search, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { shipmentColumns } from "@/components/dashboard/shipment-bits";
import { usePaginated } from "@/lib/use-paginated";
import { useRefreshSession } from "@/lib/session";

const tabs = [
  { value: "", label: "الكل" },
  { value: "created", label: "بانتظار الاستلام" },
  { value: "in_transit_group", label: "في الطريق" },
  { value: "delivered", label: "تم التوصيل" },
  { value: "failed_attempt", label: "محاولة فاشلة" },
  { value: "returned", label: "مرتجع" },
  { value: "cancelled", label: "ملغاة" },
];

function ShipmentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const refreshSession = useRefreshSession();
  const [status, setStatusValue] = useState("");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [term, setTermValue] = useState(params.get("search") ?? "");
  const [carrier, setCarrierValue] = useState("");
  const [cod, setCodValue] = useState("");
  const [from, setFromValue] = useState("");
  const [to, setToValue] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  /** Any filter change returns to the first page. */
  const withReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const setStatus = withReset(setStatusValue);
  const setTerm = withReset(setTermValue);
  const setCarrier = withReset(setCarrierValue);
  const setCod = withReset(setCodValue);
  const setFrom = withReset(setFromValue);
  const setTo = withReset(setToValue);

  const filters = {
    "filter[status]": status === "in_transit_group" ? undefined : status,
    "filter[in_transit]": status === "in_transit_group" ? 1 : undefined,
    "filter[search]": term,
    "filter[carrier_id]": carrier,
    "filter[cod]": cod,
    "filter[date_from]": from,
    "filter[date_to]": to,
  };
  const { data, isLoading, isFetching } = usePaginated<Shipment, { counts: Record<string, number> }>("merchant/shipments", { ...filters, page });
  const carriers = useQuery({ queryKey: ["carriers"], queryFn: () => api<{ data: Carrier[] }>("merchant/carriers") });

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const countFor = (value: string) =>
    value === "" ? total : value === "in_transit_group" ? ["pickup_scheduled", "picked_up", "in_transit", "out_for_delivery"].reduce((sum, key) => sum + (counts[key] ?? 0), 0) : counts[value] ?? 0;

  const ids = [...selected].map(String);

  const cancelSelected = async () => {
    const result = await api<{ data: { ok: boolean }[] }>("merchant/shipments/cancel", { method: "POST", body: { ids } });
    const ok = result.data.filter((row) => row.ok).length;
    toast[ok ? "success" : "error"](ok ? `تم إلغاء ${ok} شحنة واسترداد المبلغ.` : "لا يمكن إلغاء الشحنات المحددة.");
    setSelected(new Set());
    client.invalidateQueries({ queryKey: ["merchant/shipments"] });
    refreshSession();
  };

  const hasFilters = !!(term || carrier || cod || from || to);

  return (
    <>
      <PageHeader
        title="الشحنات"
        description="تابع جميع شحناتك وحالاتها وقم بطباعة البوالص."
        actions={
          <>
            <Button asChild variant="outline"><a href={fileUrl("merchant/shipments/export", filters)}><Download />تصدير Excel</a></Button>
            <Button asChild variant="outline"><Link href="/dashboard/shipments/bulk"><FileSpreadsheet />رفع جماعي</Link></Button>
            <Button asChild><Link href="/dashboard/shipments/new"><PackagePlus />شحنة جديدة</Link></Button>
          </>
        }
      />

      <Card>
        <div role="tablist" aria-label="حالة الشحنة" className="flex gap-1 overflow-x-auto border-b border-line px-3 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={`-mb-px flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition ${status === tab.value ? "border-green-500 font-bold text-ink" : "border-transparent text-ink-subtle hover:text-ink"}`}
            >
              {tab.label}
              <span className={`num rounded-full px-2 py-0.5 text-[11px] ${status === tab.value ? "bg-navy-900 text-white" : "bg-surface-muted text-ink-subtle"}`}>{countFor(tab.value)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <form className="min-w-60 flex-1" onSubmit={(event) => { event.preventDefault(); setTerm(search); }}>
            <label htmlFor="s-search" className="sr-only">بحث</label>
            <Input id="s-search" value={search} onChange={(event) => setSearch(event.target.value)} onBlur={() => setTerm(search)} placeholder="رقم التتبع، المرجع، الجوال، الاسم أو رقم الطلب" startIcon={<Search />} />
          </form>
          <div className="w-44">
            <label htmlFor="s-carrier" className="sr-only">شركة الشحن</label>
            <NativeSelect id="s-carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)}>
              <option value="">كل الشركات</option>
              {carriers.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </NativeSelect>
          </div>
          <div className="w-40">
            <label htmlFor="s-cod" className="sr-only">طريقة الدفع</label>
            <NativeSelect id="s-cod" value={cod} onChange={(event) => setCod(event.target.value)}>
              <option value="">كل الشحنات</option>
              <option value="1">دفع عند الاستلام</option>
              <option value="0">مدفوعة مسبقاً</option>
            </NativeSelect>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="s-from">من تاريخ</label>
            <Input id="s-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="num w-40" />
            <span className="text-ink-subtle">–</span>
            <label className="sr-only" htmlFor="s-to">إلى تاريخ</label>
            <Input id="s-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="num w-40" />
          </div>
          {hasFilters && (
            <Button variant="ghost" onClick={() => { setSearch(""); setTerm(""); setCarrier(""); setCod(""); setFrom(""); setTo(""); router.replace("/dashboard/shipments"); }}>
              <X />مسح
            </Button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-navy-900 px-4 py-2.5 text-white">
            <span className="text-sm font-bold">تم تحديد <span className="num">{selected.size}</span></span>
            <Button size="sm" variant="primary" onClick={() => openBinary("merchant/shipments/labels", { ids }).catch((error) => toast.error(error.message))}><Printer />طباعة البوالص</Button>
            <Button size="sm" variant="danger-soft" onClick={cancelSelected}><XCircle />إلغاء المحدد</Button>
            <button className="ms-auto text-sm text-white/70 hover:text-white" onClick={() => setSelected(new Set())}>إلغاء التحديد</button>
          </div>
        )}

        <div className={isFetching && !isLoading ? "opacity-60 transition" : "transition"}>
          <DataTable
            columns={shipmentColumns}
            rows={data?.data}
            loading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            empty={<EmptyState icon={<Search />} title={hasFilters || status ? "لا توجد شحنات مطابقة" : "لا توجد شحنات بعد"} description={hasFilters ? "جرّب تغيير معايير البحث." : "أنشئ شحنتك الأولى الآن."} />}
          />
        </div>
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}

/** Remount when the header quick-search changes the URL so filters start from it. */
function KeyedShipmentsPage() {
  const search = useSearchParams().get("search") ?? "";
  return <ShipmentsPage key={search} />;
}

export default function Page() {
  return <Suspense><KeyedShipmentsPage /></Suspense>;
}
