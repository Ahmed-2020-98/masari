"use client";

import { api, ApiError, fileUrl, type Address, type Carrier, type Money as MoneyValue } from "@masari/api";
import { Badge, Button, Card, CardHeader, DataTable, Field, KpiCard, Money, NativeSelect, PageHeader, toast } from "@masari/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRefreshSession } from "@/lib/session";

type Row = {
  row: number; valid: boolean; errors: string[];
  recipient: { name: string; phone: string; city_id: number | null; city: string; district?: string; street?: string; short_address?: string };
  weight_kg: number; pieces: number; contents: string | null; cod_amount: MoneyValue; order_number: string | null; notes: string | null; total: MoneyValue | null;
};
type Preview = { data: Row[]; summary: { rows: number; valid: number; invalid: number; total: MoneyValue; wallet: MoneyValue } };
type Result = { data: { row: number; ok: boolean; awb?: string; id?: string; message?: string }[]; created: number; failed: number };

export default function BulkPage() {
  const refreshSession = useRefreshSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [dragging, setDragging] = useState(false);

  const carriers = useQuery({ queryKey: ["carriers"], queryFn: () => api<{ data: Carrier[] }>("merchant/carriers") });
  const senders = useQuery({ queryKey: ["addresses", "sender"], queryFn: () => api<{ data: Address[] }>("merchant/addresses", { query: { type: "sender" } }) });

  const preview = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append("file", file!);
      body.append("carrier_service_id", serviceId);
      body.append("sender_address_id", senderId);
      return api<Preview>("merchant/shipments/bulk/preview", { method: "POST", body });
    },
    onError: (error: ApiError) => toast.error(error.message),
  });

  const importRows = useMutation({
    mutationFn: () =>
      api<Result>("merchant/shipments/bulk", {
        method: "POST",
        body: {
          carrier_service_id: Number(serviceId),
          sender_address_id: Number(senderId),
          rows: preview.data!.data.filter((row) => row.valid).map((row) => ({ ...row, cod_amount: row.cod_amount.amount })),
        },
      }),
    onSuccess: (result) => {
      refreshSession();
      toast.success(`تم إنشاء ${result.created} شحنة${result.failed ? ` وتعذر ${result.failed}` : ""}.`);
    },
    onError: (error: ApiError) => toast.error(error.message),
  });

  const ready = file && serviceId && senderId;

  return (
    <>
      <PageHeader
        title="رفع جماعي للشحنات"
        description="أنشئ مئات البوالص دفعة واحدة من ملف Excel."
        actions={<Button asChild variant="outline"><a href={fileUrl("merchant/shipments/bulk/template")}><Download />تحميل القالب</a></Button>}
      />

      {!importRows.data && (
        <Card>
          <CardHeader title="1. إعدادات الرفع" />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="شركة وخدمة الشحن" htmlFor="b-service" required>
              <NativeSelect id="b-service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                <option value="">اختر</option>
                {carriers.data?.data.map((carrier) => (
                  <optgroup key={carrier.id} label={carrier.name}>
                    {carrier.services?.map((service) => <option key={service.id} value={service.id}>{carrier.name} — {service.name}</option>)}
                  </optgroup>
                ))}
              </NativeSelect>
            </Field>
            <Field label="عنوان المرسل" htmlFor="b-sender" required>
              <NativeSelect id="b-sender" value={senderId} onChange={(event) => setSenderId(event.target.value)}>
                <option value="">اختر</option>
                {senders.data?.data.map((address) => <option key={address.id} value={address.id}>{address.label ?? address.name} — {address.city?.name}</option>)}
              </NativeSelect>
            </Field>
            <div className="md:col-span-2">
              <p className="mb-1.5 text-sm font-medium">2. ملف الشحنات</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); setFile(event.dataTransfer.files[0] ?? null); preview.reset(); }}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${dragging ? "border-green-500 bg-green-50" : "border-line-strong hover:border-navy-400"}`}
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-green-50 text-green-700"><FileSpreadsheet className="size-7" aria-hidden /></span>
                <span className="font-bold">{file ? file.name : "اسحب ملف Excel هنا أو اضغط للاختيار"}</span>
                <span className="text-sm text-ink-subtle">xlsx, xls, csv — حتى 500 شحنة</span>
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); preview.reset(); }} />
            </div>
          </div>
          <div className="flex justify-end border-t border-line p-4">
            <Button onClick={() => preview.mutate()} disabled={!ready} loading={preview.isPending}><Upload />فحص الملف</Button>
          </div>
        </Card>
      )}

      {preview.data && !importRows.data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="إجمالي الصفوف" value={preview.data.summary.rows} tone="navy" />
            <KpiCard label="صالحة" value={preview.data.summary.valid} tone="green" icon={<CheckCircle2 />} />
            <KpiCard label="بها أخطاء" value={preview.data.summary.invalid} tone="rose" icon={<XCircle />} />
            <KpiCard label="التكلفة التقديرية" value={<Money value={preview.data.summary.total} />} tone="amber" hint={<>الرصيد: <Money value={preview.data.summary.wallet} /></>} />
          </div>
          <Card className="mt-4">
            <CardHeader title="معاينة الشحنات" action={<Button onClick={() => importRows.mutate()} loading={importRows.isPending} disabled={!preview.data.summary.valid}>إنشاء {preview.data.summary.valid} شحنة</Button>} />
            <DataTable
              rows={preview.data.data}
              rowKey={(row) => row.row}
              columns={[
                { key: "row", header: "#", cell: (row) => <span className="num text-ink-subtle">{row.row}</span> },
                { key: "name", header: "المستلم", cell: (row) => <><p className="font-medium">{row.recipient.name}</p><p className="num text-xs text-ink-subtle">{row.recipient.phone}</p></> },
                { key: "city", header: "المدينة", cell: (row) => row.recipient.city },
                { key: "weight", header: "الوزن", cell: (row) => <span className="num">{row.weight_kg}</span> },
                { key: "cod", header: "التحصيل", cell: (row) => (row.cod_amount.amount ? <Money value={row.cod_amount} /> : "—") },
                { key: "total", header: "التكلفة", cell: (row) => <Money value={row.total} /> },
                { key: "status", header: "الحالة", cell: (row) => (row.valid ? <Badge tone="green" dot>صالح</Badge> : <span className="text-sm text-rose-600">{row.errors.join("، ")}</span>) },
              ]}
            />
          </Card>
        </>
      )}

      {importRows.data && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-extrabold">تم إنشاء <span className="num text-green-700">{importRows.data.created}</span> شحنة{importRows.data.failed > 0 && <> · تعذر <span className="num text-rose-600">{importRows.data.failed}</span></>}</p>
            <div className="flex gap-2">
              <Button asChild variant="navy"><Link href="/dashboard/shipments?search=">عرض الشحنات</Link></Button>
              <Button variant="outline" onClick={() => { importRows.reset(); preview.reset(); setFile(null); }}>رفع ملف آخر</Button>
            </div>
          </div>
          {importRows.data.failed > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-rose-700">
              {importRows.data.data.filter((row) => !row.ok).map((row) => <li key={row.row}>الصف <span className="num">{row.row}</span>: {row.message}</li>)}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
