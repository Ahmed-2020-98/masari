"use client";

import { api, ApiError, type Payout } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Button, Card, DataTable, Dialog, DialogContent, DialogFooter, EnumBadge, Field, Input, Money, PageHeader, Pagination, Segmented, toast } from "@masari/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePaginated } from "@/lib/use-paginated";

export default function PayoutsPage() {
  const client = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const [page, setPage] = useState(1);
  const [approving, setApproving] = useState<Payout | null>(null);
  const [rejecting, setRejecting] = useState<Payout | null>(null);
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const { data, isLoading } = usePaginated<Payout>("admin/payouts", { status, page });
  const refresh = () => { client.invalidateQueries({ queryKey: ["admin/payouts"] }); client.invalidateQueries({ queryKey: ["admin-dashboard"] }); };

  const approve = useMutation({
    mutationFn: () => {
      const body = new FormData();
      if (reference) body.append("transfer_reference", reference);
      if (proof) body.append("proof", proof);
      return api(`admin/payouts/${approving!.id}/approve`, { method: "POST", body });
    },
    onSuccess: () => { toast.success("تم تسجيل التحويل"); setApproving(null); setReference(""); setProof(null); refresh(); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const reject = useMutation({ mutationFn: () => api(`admin/payouts/${rejecting!.id}/reject`, { method: "POST", body: { reason } }), onSuccess: () => { toast.success("تم الرفض وإعادة المبلغ للمحفظة"); setRejecting(null); setReason(""); refresh(); }, onError: (error: ApiError) => toast.error(error.message) });

  return (
    <>
      <PageHeader title="التحويلات البنكية" description="حوّل المبالغ إلى حسابات التجار ثم سجّل مرجع التحويل." />
      <Card>
        <div className="border-b border-line p-4"><Segmented value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "pending", label: "قيد المراجعة" }, { value: "approved", label: "تم التحويل" }, { value: "rejected", label: "مرفوضة" }, { value: "", label: "الكل" }]} /></div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "merchant", header: "التاجر", cell: (row) => <span className="font-bold">{row.merchant?.store_name}</span> },
            { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.amount} className="text-base font-extrabold" /> },
            {
              key: "account",
              header: "الحساب",
              cell: (row) => (
                <div className="text-sm">
                  <p>{row.account_holder} · {row.bank_name}</p>
                  <button className="num flex items-center gap-1 text-ink-subtle hover:text-ink" dir="ltr" onClick={() => { navigator.clipboard.writeText(row.iban); toast.success("تم نسخ الآيبان"); }}>{row.iban}<Copy className="size-3" /></button>
                </div>
              ),
            },
            { key: "status", header: "الحالة", cell: (row) => <><EnumBadge value={row.status} />{row.transfer_reference && <p className="num mt-1 text-xs text-ink-subtle">{row.transfer_reference}</p>}</> },
            { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
            {
              key: "actions",
              header: "",
              cell: (row) => row.status.value === "pending" && (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" onClick={() => setApproving(row)}><Check />تم التحويل</Button>
                  <Button size="sm" variant="danger-soft" onClick={() => setRejecting(row)}><X />رفض</Button>
                </div>
              ),
            },
          ]}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent title="تأكيد التحويل" description={approving ? `${approving.amount.formatted} إلى ${approving.account_holder}` : undefined}>
          <div className="space-y-4">
            <Field label="مرجع التحويل" htmlFor="po-ref"><Input id="po-ref" value={reference} onChange={(event) => setReference(event.target.value)} className="num" /></Field>
            <Field label="إثبات التحويل (اختياري)" htmlFor="po-proof"><Input id="po-proof" type="file" accept="image/*,application/pdf" onChange={(event) => setProof(event.target.files?.[0] ?? null)} className="pt-2" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>إلغاء</Button>
            <Button onClick={() => approve.mutate()} loading={approve.isPending}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)} title="رفض طلب التحويل" description="سيُعاد المبلغ إلى محفظة التاجر." confirmLabel="رفض" loading={reject.isPending} onConfirm={() => reason && reject.mutate()}>
        <label htmlFor="po-reason" className="text-sm font-medium">السبب</label>
        <Input id="po-reason" className="mt-1.5" value={reason} onChange={(event) => setReason(event.target.value)} />
      </ConfirmDialog>
    </>
  );
}
