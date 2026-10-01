"use client";

import { api, ApiError, fileUrl, type Party, type Shipment } from "@masari/api";
import { formatDateTime, formatPhone } from "@masari/i18n";
import { Button, Card, CardHeader, CarrierMark, EnumBadge, Money, Skeleton, Textarea, Timeline, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, ExternalLink, Headset, MapPin, Package, Printer, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRefreshSession } from "@/lib/session";

function PartyCard({ title, party, accent }: { title: string; party: Party; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-green-200 bg-green-50/50" : "border-line"}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink-subtle"><MapPin className="size-3.5" aria-hidden />{title}</p>
      <p className="mt-2 font-bold">{party.name}</p>
      <p className="num text-sm text-ink-muted" dir="ltr" style={{ textAlign: "right" }}>{formatPhone(party.phone)}</p>
      <p className="mt-1 text-sm text-ink-muted">{[party.city, party.district, party.street, party.building_no].filter(Boolean).join("، ")}</p>
      {party.short_address && <p className="num mt-1 text-xs text-ink-subtle">العنوان الوطني: {party.short_address}</p>}
    </div>
  );
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const refreshSession = useRefreshSession();
  const [confirm, setConfirm] = useState<"cancel" | "return" | null>(null);
  const [reason, setReason] = useState("");
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["shipment", id], queryFn: () => api<{ data: Shipment }>(`merchant/shipments/${id}`), refetchInterval: 30_000 });
  const shipment = data?.data;

  const onDone = (message: string) => {
    toast.success(message);
    client.invalidateQueries({ queryKey: ["shipment", id] });
    client.invalidateQueries({ queryKey: ["merchant/shipments"] });
    refreshSession();
    setConfirm(null);
  };

  const cancel = useMutation({
    mutationFn: () => api(`merchant/shipments/${id}/cancel`, { method: "POST" }),
    onSuccess: () => onDone("تم إلغاء الشحنة واسترداد المبلغ إلى محفظتك."),
    onError: (exception: ApiError) => toast.error(exception.message),
  });
  const createReturn = useMutation({
    mutationFn: () => api<{ data: Shipment }>(`merchant/shipments/${id}/return`, { method: "POST", body: { reason: reason || null } }),
    onSuccess: (result) => {
      onDone("تم إنشاء شحنة الإرجاع.");
      router.push(`/dashboard/shipments/${result.data.id}`);
    },
    onError: (exception: ApiError) => toast.error(exception.message),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;
  if (isError || !shipment) return <Card className="p-10 text-center"><p className="font-bold">{error?.message ?? "لم يتم العثور على الشحنة"}</p><Button asChild className="mt-4"><Link href="/dashboard/shipments">العودة للشحنات</Link></Button></Card>;

  const breakdown = [
    ["الشحن", shipment.price],
    ["ضريبة القيمة المضافة (15%)", shipment.vat],
  ] as const;

  return (
    <>
      <Link href="/dashboard/shipments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-subtle hover:text-ink"><ArrowRight className="size-4" />الشحنات</Link>

      <Card className="grain relative overflow-hidden border-0 bg-navy-900 p-5 text-white md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {shipment.carrier && <CarrierMark carrier={shipment.carrier} size="lg" />}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="num text-2xl font-extrabold tracking-wider">{shipment.awb}</h1>
                <button
                  onClick={() => { navigator.clipboard.writeText(shipment.awb ?? ""); toast.success("تم نسخ رقم التتبع"); }}
                  className="grid size-8 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="نسخ رقم التتبع"
                >
                  <Copy className="size-4" />
                </button>
                <EnumBadge value={shipment.status} />
                {shipment.type.value === "return" && <EnumBadge value={shipment.type} />}
              </div>
              <p className="mt-1 text-sm text-white/60">
                {shipment.carrier?.name} · {shipment.service?.name} · <span className="num">{shipment.reference}</span>
                {shipment.order_number && <> · طلب <span className="num">{shipment.order_number}</span></>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {shipment.has_label && shipment.status.value !== "cancelled" && (
              <Button asChild variant="primary"><a href={fileUrl(`merchant/shipments/${shipment.id}/label`)} target="_blank" rel="noopener"><Printer />طباعة البوليصة</a></Button>
            )}
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10"><a href={`/track/${shipment.awb}`} target="_blank" rel="noopener"><ExternalLink />صفحة التتبع</a></Button>
            {shipment.status.value === "delivered" && shipment.type.value === "outbound" && (
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setConfirm("return")}><RotateCcw />إنشاء مرتجع</Button>
            )}
            {shipment.is_cancellable && <Button variant="danger-soft" onClick={() => setConfirm("cancel")}><XCircle />إلغاء</Button>}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="سجل التتبع" description="يتم التحديث تلقائياً" />
            <div className="p-5">{shipment.events?.length ? <Timeline events={shipment.events} formatDate={formatDateTime} /> : <p className="text-sm text-ink-subtle">لا توجد تحديثات بعد.</p>}</div>
          </Card>
          <Card>
            <CardHeader title="المرسل والمستلم" />
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <PartyCard title="المرسل" party={shipment.sender} />
              <PartyCard title="المستلم" party={shipment.recipient} accent />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {shipment.cod.amount.amount > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink-subtle">الدفع عند الاستلام</p>
                <EnumBadge value={shipment.cod.status} />
              </div>
              <Money value={shipment.cod.amount} className="mt-2 block text-3xl font-extrabold" />
              <p className="mt-2 text-xs text-ink-subtle">يُضاف المبلغ إلى محفظتك بعد توريده من شركة الشحن.</p>
            </Card>
          )}
          <Card>
            <CardHeader title="تفاصيل الطرد" />
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div><dt className="text-ink-subtle">الوزن الفعلي</dt><dd className="num font-bold">{shipment.weight_kg} كجم</dd></div>
              <div><dt className="text-ink-subtle">الوزن المحتسب</dt><dd className="num font-bold">{shipment.chargeable_weight_kg} كجم</dd></div>
              <div><dt className="text-ink-subtle">عدد القطع</dt><dd className="num font-bold">{shipment.pieces}</dd></div>
              <div><dt className="text-ink-subtle">النطاق</dt><dd className="font-bold">{shipment.zone.label}</dd></div>
              <div className="col-span-2"><dt className="text-ink-subtle">المحتوى</dt><dd className="font-bold">{shipment.contents ?? "—"}</dd></div>
              {shipment.notes && <div className="col-span-2"><dt className="text-ink-subtle">ملاحظات</dt><dd>{shipment.notes}</dd></div>}
              <div className="col-span-2"><dt className="text-ink-subtle">تاريخ الإنشاء</dt><dd className="num">{formatDateTime(shipment.created_at)}</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="التكلفة" />
            <dl className="space-y-2.5 p-5 text-sm">
              {breakdown.map(([label, value]) => (
                <div key={label} className="flex justify-between"><dt className="text-ink-muted">{label}</dt><dd><Money value={value} /></dd></div>
              ))}
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-bold">الإجمالي المخصوم</dt><dd><Money value={shipment.total} className="font-extrabold" /></dd></div>
            </dl>
          </Card>
          <Button asChild variant="outline" className="w-full"><Link href={`/dashboard/support?shipment=${shipment.id}`}><Headset />لديك مشكلة؟ افتح تذكرة دعم</Link></Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-subtle"><Package className="size-3.5" />مصدر الشحنة: {shipment.source}</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="إلغاء الشحنة؟"
        description={`سيتم إلغاء البوليصة لدى ${shipment.carrier?.name} واسترداد ${shipment.total.formatted} إلى محفظتك.`}
        confirmLabel="نعم، إلغاء الشحنة"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
      <ConfirmDialog
        open={confirm === "return"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="إنشاء شحنة مرتجعة"
        description="سيتم إنشاء بوليصة جديدة من العميل إليك بنفس شركة الشحن، وتُخصم تكلفتها من المحفظة."
        confirmLabel="إنشاء المرتجع"
        tone="primary"
        loading={createReturn.isPending}
        onConfirm={() => createReturn.mutate()}
      >
        <label htmlFor="return-reason" className="text-sm font-medium">سبب الإرجاع (اختياري)</label>
        <Textarea id="return-reason" className="mt-1.5" value={reason} onChange={(event) => setReason(event.target.value)} />
      </ConfirmDialog>
    </>
  );
}
