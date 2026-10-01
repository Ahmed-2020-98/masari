"use client";

import { api, ApiError, type Enum, type Ticket } from "@masari/api";
import { formatRelative } from "@masari/i18n";
import { Button, Card, DataTable, Dialog, DialogContent, DialogFooter, EmptyState, EnumBadge, Field, Input, NativeSelect, PageHeader, Pagination, Textarea, toast } from "@masari/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Headset, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { usePaginated } from "@/lib/use-paginated";

function SupportPage() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(() => !!params.get("shipment"));
  const [form, setForm] = useState({ subject: "", category: "shipment", body: "", shipment_id: params.get("shipment") ?? "" });
  const [files, setFiles] = useState<FileList | null>(null);
  const { data, isLoading } = usePaginated<Ticket, { categories: Enum[] }>("merchant/tickets", { page });

  const create = useMutation({
    mutationFn: () => {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value && body.append(key, value));
      Array.from(files ?? []).forEach((file) => body.append("attachments[]", file));
      return api<{ data: Ticket }>("merchant/tickets", { method: "POST", body });
    },
    onSuccess: (result) => {
      toast.success("تم فتح التذكرة، سيرد عليك فريق الدعم قريباً.");
      client.invalidateQueries({ queryKey: ["merchant/tickets"] });
      router.push(`/dashboard/support/${result.data.id}`);
    },
  });
  const error = create.error instanceof ApiError ? create.error : null;

  return (
    <>
      <PageHeader title="الدعم الفني" description="فريقنا متواجد لمتابعة أي مشكلة في شحناتك أو محفظتك." actions={<Button onClick={() => setOpen(true)}><Plus />تذكرة جديدة</Button>} />
      <Card>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/dashboard/support/${row.id}`)}
          columns={[
            { key: "number", header: "رقم التذكرة", cell: (row) => <span className="num font-bold">{row.number}</span> },
            { key: "subject", header: "الموضوع", cell: (row) => <><p className="font-medium">{row.subject}</p>{row.shipment && <p className="num text-xs text-ink-subtle">{row.shipment.awb}</p>}</> },
            { key: "category", header: "التصنيف", cell: (row) => row.category.label },
            { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
            { key: "updated", header: "آخر رد", cell: (row) => <span className="text-xs text-ink-subtle">{formatRelative(row.last_reply_at)}</span> },
          ]}
          empty={<EmptyState icon={<Headset />} title="لا توجد تذاكر" description="هل تواجه مشكلة؟ افتح تذكرة وسنتابعها معك." action={<Button onClick={() => setOpen(true)}>تذكرة جديدة</Button>} />}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="فتح تذكرة دعم" size="lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الموضوع" htmlFor="t-subject" required error={error?.field("subject")} className="sm:col-span-2"><Input id="t-subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
            <Field label="التصنيف" htmlFor="t-category"><NativeSelect id="t-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{data?.categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</NativeSelect></Field>
            <Field label="رقم الشحنة (اختياري)" htmlFor="t-shipment" hint={form.shipment_id ? "مرتبطة بالشحنة المختارة" : undefined}><Input id="t-shipment" value={form.shipment_id} onChange={(event) => setForm({ ...form, shipment_id: event.target.value })} className="num" disabled={!!params.get("shipment")} /></Field>
            <Field label="التفاصيل" htmlFor="t-body" required error={error?.field("body")} className="sm:col-span-2"><Textarea id="t-body" rows={5} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
            <Field label="مرفقات" htmlFor="t-files" hint="صور أو PDF — حتى 5 ملفات" className="sm:col-span-2"><Input id="t-files" type="file" multiple accept="image/*,application/pdf" onChange={(event) => setFiles(event.target.files)} className="pt-2" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.subject || !form.body}>إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Page() {
  return <Suspense><SupportPage /></Suspense>;
}
