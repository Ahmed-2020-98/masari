"use client";

import { api, ApiError, type Shipment } from "@masari/api";
import { formatDateTime, formatPhone } from "@masari/i18n";
import { Button, Card, CardHeader, CarrierMark, EnumBadge, Field, Input, Money, NativeSelect, Skeleton, Timeline, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SHIPMENT_STATUSES } from "@/components/bits";

export default function AdminShipment() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-shipment", id], queryFn: () => api<{ data: Shipment }>(`admin/shipments/${id}`) });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin-shipment", id] });
  const force = useMutation({ mutationFn: () => api(`admin/shipments/${id}/status`, { method: "POST", body: { status, description: description || null } }), onSuccess: () => { toast.success("تم تحديث الحالة"); setStatus(""); setDescription(""); refresh(); }, onError: (error: ApiError) => toast.error(error.message) });
  const sync = useMutation({ mutationFn: () => api(`admin/shipments/${id}/sync`, { method: "POST" }), onSuccess: () => { toast.success("تمت المزامنة"); refresh(); } });

  const shipment = data?.data;
  if (isLoading || !shipment) return <Skeleton className="h-96" />;

  return (
    <>
      <Link href="/shipments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink"><ArrowRight className="size-4" />الشحنات</Link>
      <Card className="flex flex-wrap items-center gap-4 p-5">
        {shipment.carrier && <CarrierMark carrier={shipment.carrier} size="lg" />}
        <div className="flex-1">
          <p className="num text-2xl font-extrabold">{shipment.awb}</p>
          <p className="text-sm text-ink-subtle">{shipment.merchant && <Link href={`/merchants/${shipment.merchant.id}`} className="font-bold text-primary-text">{shipment.merchant.store_name}</Link>} · <span className="num">{shipment.reference}</span> · {shipment.service?.name}</p>
        </div>
        <EnumBadge value={shipment.status} />
        <Button variant="outline" onClick={() => sync.mutate()} loading={sync.isPending}><RefreshCw />مزامنة مع الشركة</Button>
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="سجل التتبع" />
          <div className="p-5">{shipment.events && <Timeline events={shipment.events} formatDate={formatDateTime} />}</div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="تحديث الحالة يدوياً" description="يُسجَّل في سجل النشاط ويُشعر التاجر." />
            <div className="space-y-3 p-5">
              <Field label="الحالة الجديدة" htmlFor="f-status"><NativeSelect id="f-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">اختر</option>{SHIPMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
              <Field label="الوصف" htmlFor="f-desc"><Input id="f-desc" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
              <Button className="w-full" variant="navy" onClick={() => force.mutate()} loading={force.isPending} disabled={!status}>تحديث</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="المالية" />
            <dl className="space-y-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-subtle">تكلفة الشركة</dt><dd><Money value={shipment.carrier_cost} /></dd></div>
              <div className="flex justify-between"><dt className="text-ink-subtle">سعر البيع</dt><dd><Money value={shipment.price} /></dd></div>
              <div className="flex justify-between"><dt className="text-ink-subtle">الضريبة</dt><dd><Money value={shipment.vat} /></dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>الإجمالي</dt><dd><Money value={shipment.total} /></dd></div>
              {shipment.cod.amount.amount > 0 && <div className="flex justify-between"><dt className="text-ink-subtle">التحصيل</dt><dd className="flex items-center gap-2"><Money value={shipment.cod.amount} /><EnumBadge value={shipment.cod.status} /></dd></div>}
            </dl>
          </Card>
          <Card className="p-5 text-sm">
            <p className="font-bold">المستلم</p>
            <p className="mt-1">{shipment.recipient.name} · <span className="num">{formatPhone(shipment.recipient.phone)}</span></p>
            <p className="text-ink-muted">{[shipment.recipient.city, shipment.recipient.district, shipment.recipient.street].filter(Boolean).join("، ")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
