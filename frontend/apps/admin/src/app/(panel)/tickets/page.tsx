"use client";

import type { Ticket } from "@masari/api";
import { formatRelative } from "@masari/i18n";
import { Card, DataTable, EnumBadge, PageHeader, Pagination, Segmented } from "@masari/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePaginated } from "@/lib/use-paginated";

export default function TicketsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"open" | "answered" | "closed" | "">("open");
  const [mine, setMine] = useState<"" | "1">("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePaginated<Ticket>("admin/tickets", { status, mine, page });

  return (
    <>
      <PageHeader title="تذاكر الدعم" />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <Segmented value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "open", label: "مفتوحة" }, { value: "answered", label: "تم الرد" }, { value: "closed", label: "مغلقة" }, { value: "", label: "الكل" }]} />
          <Segmented value={mine} onChange={setMine} options={[{ value: "", label: "كل التذاكر" }, { value: "1", label: "المسندة لي" }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/tickets/${row.id}`)}
          columns={[
            { key: "number", header: "#", cell: (row) => <span className="num font-bold">{row.number}</span> },
            { key: "merchant", header: "التاجر", cell: (row) => row.merchant?.store_name },
            { key: "subject", header: "الموضوع", cell: (row) => <><p className="font-medium">{row.subject}</p><p className="text-xs text-ink-subtle">{row.category.label}</p></> },
            { key: "priority", header: "الأولوية", cell: (row) => <span className={row.priority === "urgent" || row.priority === "high" ? "font-bold text-rose-600" : "text-ink-muted"}>{{ low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" }[row.priority] ?? row.priority}</span> },
            { key: "assignee", header: "المسؤول", cell: (row) => row.assignee?.name ?? <span className="text-ink-subtle">—</span> },
            { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
            { key: "last", header: "آخر رد", cell: (row) => <span className="text-xs text-ink-subtle">{formatRelative(row.last_reply_at)}</span> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
