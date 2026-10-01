"use client";

import { api, type Carrier, type Shipment } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Card, DataTable, EnumBadge, Input, Money, NativeSelect, PageHeader, Pagination } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CarrierCell, SHIPMENT_STATUSES } from "@/components/bits";
import { usePaginated } from "@/lib/use-paginated";

function ShipmentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [carrier, setCarrier] = useState("");
  const [page, setPage] = useState(1);
  const merchant = params.get("merchant") ?? "";
  const { data, isLoading } = usePaginated<Shipment>("admin/shipments", { "filter[search]": term, "filter[status]": status, "filter[carrier_id]": carrier, "filter[merchant_id]": merchant, page });
  const carriers = useQuery({ queryKey: ["admin-carriers"], queryFn: () => api<{ data: Carrier[] }>("admin/carriers") });

  return (
    <>
      <PageHeader title="الشحنات" description={merchant ? `شحنات التاجر #${merchant}` : "جميع شحنات المنصة."} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <form className="min-w-60 flex-1" onSubmit={(event) => { event.preventDefault(); setTerm(search); setPage(1); }}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} onBlur={() => setTerm(search)} placeholder="رقم التتبع، المرجع أو الجوال" startIcon={<Search />} aria-label="بحث" />
          </form>
          <div className="w-48"><NativeSelect value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="الحالة"><option value="">كل الحالات</option>{SHIPMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
          <div className="w-44"><NativeSelect value={carrier} onChange={(event) => { setCarrier(event.target.value); setPage(1); }} aria-label="الشركة"><option value="">كل الشركات</option>{carriers.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></div>
        </div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/shipments/${row.id}`)}
          columns={[
            { key: "carrier", header: "الشحنة", cell: (row) => <CarrierCell shipment={row} /> },
            { key: "merchant", header: "التاجر", cell: (row) => row.merchant?.store_name },
            { key: "route", header: "المسار", cell: (row) => <span className="text-sm">{row.sender.city} ← {row.recipient.city}</span> },
            { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
            { key: "price", header: "السعر / التكلفة", cell: (row) => <><Money value={row.price} className="font-bold" /><p className="text-xs text-ink-subtle">تكلفة <Money value={row.carrier_cost} /></p></> },
            { key: "cod", header: "التحصيل", cell: (row) => (row.cod.amount.amount ? <><Money value={row.cod.amount} /><div><EnumBadge value={row.cod.status} /></div></> : "—") },
            { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}

export default function Page() {
  return <Suspense><ShipmentsPage /></Suspense>;
}
