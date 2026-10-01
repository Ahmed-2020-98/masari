"use client";

import { api, ApiError, type CodSettlement, type Money as MoneyValue, type Shipment } from "@masari/api";
import { formatDate } from "@masari/i18n";
import { Button, Card, CardHeader, DataTable, EmptyState, Field, Input, Money, PageHeader, Textarea, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCheck } from "lucide-react";
import { useState } from "react";
import { CarrierCell } from "@/components/bits";

type Overview = { data: { carrier: { id: number; name: string; brand_color: string | null }; shipments: number; total: MoneyValue }[]; settlements: CodSettlement[] };

export default function CodPage() {
  const client = useQueryClient();
  const [carrierId, setCarrierId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [awbs, setAwbs] = useState("");
  const [reference, setReference] = useState("");
  const overview = useQuery({ queryKey: ["cod-overview"], queryFn: () => api<{ data: Overview["data"]; settlements: { data: CodSettlement[] } | CodSettlement[] }>("admin/cod") });
  const shipments = useQuery({ queryKey: ["cod-shipments", carrierId], queryFn: () => api<{ data: Shipment[] }>("admin/cod/shipments", { query: { carrier_id: carrierId } }), enabled: !!carrierId });
  const settlements = overview.data ? (Array.isArray(overview.data.settlements) ? overview.data.settlements : overview.data.settlements.data) : [];

  const settle = useMutation({
    mutationFn: () => api<{ data: CodSettlement }>("admin/cod/settle", { method: "POST", body: { carrier_id: carrierId, shipment_ids: [...selected], awbs, reference: reference || null } }),
    onSuccess: (result) => {
      toast.success(`تمت تسوية ${result.data.shipments_count} شحنة بإجمالي ${result.data.total_amount.formatted}`);
      setSelected(new Set()); setAwbs(""); setReference("");
      client.invalidateQueries({ queryKey: ["cod-overview"] });
      client.invalidateQueries({ queryKey: ["cod-shipments"] });
    },
    onError: (error: ApiError) => toast.error(error.message),
  });

  const selectedTotal = (shipments.data?.data ?? []).filter((row) => selected.has(row.id)).reduce((sum, row) => sum + row.cod.amount.amount, 0);

  return (
    <>
      <PageHeader title="تسويات الدفع عند الاستلام" description="طابق كشف توريد شركة الشحن ثم أضف المبالغ لمحافظ التجار." />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        {overview.data?.data.map((row) => (
          <button key={row.carrier.id} onClick={() => { setCarrierId(row.carrier.id); setSelected(new Set()); }} className={`rounded-lg border p-4 text-start transition ${carrierId === row.carrier.id ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-surface hover:border-navy-400"}`}>
            <p className="flex items-center gap-2 font-bold"><span className="size-2.5 rounded-full" style={{ backgroundColor: row.carrier.brand_color ?? "#0F2741" }} />{row.carrier.name}</p>
            <Money value={row.total} className="mt-2 block text-2xl font-extrabold" />
            <p className="num text-xs opacity-70">{row.shipments} شحنة محصّلة</p>
          </button>
        ))}
        {overview.data?.data.length === 0 && <Card className="md:col-span-3"><EmptyState icon={<CheckCheck />} title="لا توجد مبالغ بانتظار التسوية" /></Card>}
      </div>

      {carrierId && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader title="الشحنات المحصّلة" description="حدد الشحنات الواردة في كشف التوريد." />
            <DataTable
              rows={shipments.data?.data}
              loading={shipments.isLoading}
              rowKey={(row) => row.id}
              selectable
              selected={selected}
              onSelectedChange={setSelected}
              columns={[
                { key: "shipment", header: "الشحنة", cell: (row) => <CarrierCell shipment={row} /> },
                { key: "merchant", header: "التاجر", cell: (row) => row.merchant?.store_name },
                { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.cod.amount} className="font-bold" /> },
                { key: "delivered", header: "تاريخ التسليم", cell: (row) => <span className="num text-xs">{formatDate(row.delivered_at)}</span> },
              ]}
            />
          </Card>
          <Card className="h-fit p-5">
            <p className="font-bold">تأكيد التسوية</p>
            <p className="mt-3 text-sm text-ink-subtle">المحدد</p>
            <p className="num text-3xl font-extrabold">{(selectedTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-sm">ر.س</span></p>
            <div className="mt-4 space-y-3">
              <Field label="أو الصق أرقام التتبع من الكشف" htmlFor="c-awbs"><Textarea id="c-awbs" rows={4} dir="ltr" value={awbs} onChange={(event) => setAwbs(event.target.value)} className="num text-sm" /></Field>
              <Field label="مرجع التوريد" htmlFor="c-ref"><Input id="c-ref" value={reference} onChange={(event) => setReference(event.target.value)} className="num" /></Field>
            </div>
            <Button className="mt-4 w-full" onClick={() => settle.mutate()} loading={settle.isPending} disabled={!selected.size && !awbs.trim()}><Banknote />إضافة للمحافظ</Button>
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="آخر التسويات" />
        <DataTable
          rows={settlements}
          loading={overview.isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "carrier", header: "الشركة", cell: (row) => row.carrier?.name },
            { key: "ref", header: "المرجع", cell: (row) => <span className="num">{row.reference ?? "—"}</span> },
            { key: "count", header: "الشحنات", cell: (row) => <span className="num">{row.shipments_count}</span> },
            { key: "total", header: "الإجمالي", cell: (row) => <Money value={row.total_amount} className="font-bold" /> },
            { key: "date", header: "تاريخ التوريد", cell: (row) => <span className="num text-xs">{formatDate(row.remitted_on)}</span> },
          ]}
          empty={<p className="p-6 text-center text-sm text-ink-subtle">لا توجد تسويات بعد.</p>}
        />
      </Card>
    </>
  );
}
