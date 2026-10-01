"use client";

import type { ActivityLog } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Card, DataTable, Input, PageHeader, Pagination } from "@masari/ui";
import { useState } from "react";
import { usePaginated } from "@/lib/use-paginated";

export default function ActivityPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePaginated<ActivityLog>("admin/activity", { action, page });

  return (
    <>
      <PageHeader title="سجل النشاط" description="كل الإجراءات الحساسة في المنصة (المحافظ، الموافقات، الأسعار)." />
      <Card>
        <div className="border-b border-line p-4"><Input value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} placeholder="تصفية بالإجراء، مثال: admin.wallet" dir="ltr" className="num max-w-sm" aria-label="تصفية" /></div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "action", header: "الإجراء", cell: (row) => <code className="num text-sm">{row.action}</code> },
            { key: "user", header: "المستخدم", cell: (row) => row.user ?? "—" },
            { key: "merchant", header: "التاجر", cell: (row) => row.merchant ?? "—" },
            { key: "subject", header: "العنصر", cell: (row) => (row.subject ? <span className="num text-xs">{row.subject.type} #{row.subject.id}</span> : "—") },
            { key: "props", header: "التفاصيل", cell: (row) => <code className="num block max-w-xs truncate text-xs text-ink-subtle" dir="ltr">{row.properties ? JSON.stringify(row.properties) : ""}</code> },
            { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
