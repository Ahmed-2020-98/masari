"use client";

import { api, ApiError, fileUrl, type Topup } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Button, Card, DataTable, EnumBadge, Input, Money, PageHeader, Pagination, Segmented, toast } from "@masari/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, FileImage, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePaginated } from "@/lib/use-paginated";

export default function TopupsPage() {
  const client = useQueryClient();
  const [status, setStatus] = useState<"pending" | "paid" | "rejected" | "">("pending");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Topup | null>(null);
  const [reason, setReason] = useState("");
  const { data, isLoading } = usePaginated<Topup>("admin/topups", { status, page });
  const refresh = () => { client.invalidateQueries({ queryKey: ["admin/topups"] }); client.invalidateQueries({ queryKey: ["admin-dashboard"] }); };

  const approve = useMutation({ mutationFn: (topup: Topup) => api(`admin/topups/${topup.id}/approve`, { method: "POST" }), onSuccess: () => { toast.success("تم اعتماد الشحن وإضافة الرصيد"); refresh(); }, onError: (error: ApiError) => toast.error(error.message) });
  const reject = useMutation({ mutationFn: () => api(`admin/topups/${rejecting!.id}/reject`, { method: "POST", body: { reason } }), onSuccess: () => { toast.success("تم رفض الطلب"); setRejecting(null); setReason(""); refresh(); }, onError: (error: ApiError) => toast.error(error.message) });

  return (
    <>
      <PageHeader title="طلبات شحن الرصيد" description="راجع إيصالات التحويل البنكي واعتمدها لإضافة الرصيد." />
      <Card>
        <div className="border-b border-line p-4"><Segmented value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "pending", label: "قيد المراجعة" }, { value: "paid", label: "مكتملة" }, { value: "rejected", label: "مرفوضة" }, { value: "", label: "الكل" }]} /></div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "id", header: "#", cell: (row) => <span className="num text-ink-subtle">{row.id}</span> },
            { key: "merchant", header: "التاجر", cell: (row) => <span className="font-bold">{row.merchant?.store_name}</span> },
            { key: "method", header: "الطريقة", cell: (row) => <><p>{row.method.label}</p>{row.bank_name && <p className="text-xs text-ink-subtle">{row.bank_name} · <span className="num">{row.transfer_reference}</span></p>}</> },
            { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.amount} className="font-bold" /> },
            { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
            { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
            {
              key: "actions",
              header: "",
              cell: (row) => (
                <div className="flex justify-end gap-1.5">
                  {row.has_receipt && <Button asChild size="sm" variant="outline"><a href={fileUrl(`admin/topups/${row.id}/receipt`)} target="_blank" rel="noopener"><FileImage />الإيصال</a></Button>}
                  {row.status.value === "pending" && row.method.value === "bank_transfer" && (
                    <>
                      <Button size="sm" onClick={() => approve.mutate(row)} loading={approve.isPending && approve.variables?.id === row.id}><Check />اعتماد</Button>
                      <Button size="sm" variant="danger-soft" onClick={() => setRejecting(row)}><X />رفض</Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      <ConfirmDialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)} title="رفض طلب الشحن" confirmLabel="رفض" loading={reject.isPending} onConfirm={() => reason && reject.mutate()}>
        <label htmlFor="reject-reason" className="text-sm font-medium">سبب الرفض (يظهر للتاجر)</label>
        <Input id="reject-reason" className="mt-1.5" value={reason} onChange={(event) => setReason(event.target.value)} />
      </ConfirmDialog>
    </>
  );
}
