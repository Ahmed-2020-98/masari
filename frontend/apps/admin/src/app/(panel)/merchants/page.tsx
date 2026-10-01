"use client";

import type { Merchant, Plan } from "@masari/api";
import { api } from "@masari/api";
import { formatDate, formatPhone } from "@masari/i18n";
import { Card, DataTable, EnumBadge, Input, Money, NativeSelect, PageHeader, Pagination } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePaginated } from "@/lib/use-paginated";

export default function MerchantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePaginated<Merchant>("admin/merchants", { search: term, status, plan_id: plan, page });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api<{ data: Plan[] }>("admin/plans") });

  return (
    <>
      <PageHeader title="التجار" description="إدارة حسابات التجار وباقاتهم وأرصدتهم." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <form className="min-w-60 flex-1" onSubmit={(event) => { event.preventDefault(); setTerm(search); setPage(1); }}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} onBlur={() => setTerm(search)} placeholder="اسم المتجر، الاسم، الجوال أو الرقم" startIcon={<Search />} aria-label="بحث" />
          </form>
          <div className="w-40"><NativeSelect value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="الحالة"><option value="">كل الحالات</option><option value="active">نشط</option><option value="pending">بانتظار التفعيل</option><option value="suspended">موقوف</option></NativeSelect></div>
          <div className="w-40"><NativeSelect value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }} aria-label="الباقة"><option value="">كل الباقات</option>{plans.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></div>
        </div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/merchants/${row.id}`)}
          columns={[
            { key: "id", header: "#", cell: (row) => <span className="num text-ink-subtle">{row.id}</span> },
            { key: "store", header: "المتجر", cell: (row) => <><p className="font-bold">{row.store_name}</p><p className="text-xs text-ink-subtle">{row.name}</p></> },
            { key: "phone", header: "الجوال", cell: (row) => <span className="num" dir="ltr">{formatPhone(row.phone)}</span> },
            { key: "plan", header: "الباقة", cell: (row) => row.plan?.name ?? "—" },
            { key: "shipments", header: "الشحنات", cell: (row) => <span className="num">{row.shipments_count}</span> },
            { key: "wallet", header: "الرصيد", cell: (row) => <Money value={row.wallet_balance} className="font-bold" /> },
            { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
            { key: "date", header: "تاريخ التسجيل", cell: (row) => <span className="num text-xs text-ink-muted">{formatDate(row.created_at)}</span> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
