"use client";

import { api, ApiError, type Carrier, type CarrierService, type Enum } from "@masari/api";
import { Badge, Button, Card, CardHeader, CarrierMark, Dialog, DialogContent, DialogFooter, Field, Input, Money, PageHeader, Skeleton, Switch, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

type RateRow = { zone: string; base_weight_kg: string; base_price: string; extra_kg_price: string };
type ServiceForm = { id?: number; code: string; name_ar: string; eta_min_days: string; eta_max_days: string; max_weight_kg: string; is_active: boolean; rates: RateRow[] };

function ServiceDialog({ carrier, service, zones, onClose }: { carrier: Carrier; service?: CarrierService; zones: Enum[]; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState<ServiceForm>(() => ({
    id: service?.id,
    code: service?.code ?? "standard",
    name_ar: service?.name ?? "",
    eta_min_days: String(service?.eta_min_days ?? 2),
    eta_max_days: String(service?.eta_max_days ?? 4),
    max_weight_kg: String(service?.max_weight_kg ?? 50),
    is_active: service?.is_active ?? true,
    rates: zones.map((zone) => {
      const rate = service?.rates?.find((item) => item.zone.value === zone.value);
      return { zone: zone.value, base_weight_kg: String(rate?.base_weight_kg ?? 15), base_price: String(rate?.base_price.value ?? ""), extra_kg_price: String(rate?.extra_kg_price.value ?? "") };
    }),
  }));
  const save = useMutation({
    mutationFn: () => api(`admin/carriers/${carrier.id}/services`, { method: "POST", body: { ...form, eta_min_days: Number(form.eta_min_days), eta_max_days: Number(form.eta_max_days), max_weight_kg: Number(form.max_weight_kg), rates: form.rates.map((rate) => ({ zone: rate.zone, base_weight_kg: Number(rate.base_weight_kg), base_price: Number(rate.base_price), extra_kg_price: Number(rate.extra_kg_price) })) } }),
    onSuccess: () => { toast.success("تم حفظ الخدمة والأسعار"); client.invalidateQueries({ queryKey: ["admin-carriers"] }); onClose(); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const setRate = (index: number, key: keyof RateRow, value: string) => setForm({ ...form, rates: form.rates.map((rate, i) => (i === index ? { ...rate, [key]: value } : rate)) });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={`${carrier.name} — ${service ? "تعديل خدمة" : "خدمة جديدة"}`} description="أسعار التكلفة من شركة الشحن بالريال قبل الضريبة. يُضاف هامش الباقة تلقائياً." size="xl">
        <div className="grid gap-4 sm:grid-cols-5">
          <Field label="الرمز" htmlFor="sv-code"><Input id="sv-code" dir="ltr" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field>
          <Field label="الاسم" htmlFor="sv-name" className="sm:col-span-2"><Input id="sv-name" value={form.name_ar} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} /></Field>
          <Field label="المدة (أيام)" htmlFor="sv-eta"><div className="flex gap-1"><Input id="sv-eta" type="number" value={form.eta_min_days} onChange={(event) => setForm({ ...form, eta_min_days: event.target.value })} className="num" aria-label="أقل مدة" /><Input type="number" value={form.eta_max_days} onChange={(event) => setForm({ ...form, eta_max_days: event.target.value })} className="num" aria-label="أقصى مدة" /></div></Field>
          <Field label="أقصى وزن" htmlFor="sv-max"><Input id="sv-max" type="number" value={form.max_weight_kg} onChange={(event) => setForm({ ...form, max_weight_kg: event.target.value })} className="num" endAdornment="كجم" /></Field>
        </div>
        <table className="mt-5 w-full text-sm">
          <thead><tr className="text-xs text-ink-subtle"><th className="py-2 text-start">النطاق</th><th className="py-2 text-start">الوزن الأساسي (كجم)</th><th className="py-2 text-start">السعر الأساسي (ر.س)</th><th className="py-2 text-start">كل كجم إضافي (ر.س)</th></tr></thead>
          <tbody>
            {form.rates.map((rate, index) => (
              <tr key={rate.zone} className="border-t border-line">
                <td className="py-2 pe-2 font-medium">{zones.find((zone) => zone.value === rate.zone)?.label}</td>
                <td className="py-2 pe-2"><Input type="number" step="0.5" value={rate.base_weight_kg} onChange={(event) => setRate(index, "base_weight_kg", event.target.value)} className="num h-9" aria-label="الوزن الأساسي" /></td>
                <td className="py-2 pe-2"><Input type="number" step="0.01" value={rate.base_price} onChange={(event) => setRate(index, "base_price", event.target.value)} className="num h-9" aria-label="السعر الأساسي" /></td>
                <td className="py-2"><Input type="number" step="0.01" value={rate.extra_kg_price} onChange={(event) => setRate(index, "extra_kg_price", event.target.value)} className="num h-9" aria-label="سعر الكيلو الإضافي" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="mt-4 flex items-center gap-3 text-sm"><Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} aria-label="مفعلة" />الخدمة مفعلة</label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CarriersPage() {
  const client = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-carriers"], queryFn: () => api<{ data: Carrier[]; zones: Enum[] }>("admin/carriers") });
  const [editing, setEditing] = useState<{ carrier: Carrier; service?: CarrierService } | null>(null);
  const toggle = useMutation({
    mutationFn: ({ carrier, patch }: { carrier: Carrier; patch: Partial<Carrier> }) =>
      api(`admin/carriers/${carrier.id}`, { method: "PUT", body: { code: carrier.code, name_ar: carrier.name, name_en: carrier.name_en, brand_color: carrier.brand_color, logo: carrier.logo, driver: carrier.driver ?? "mock", supports_cod: carrier.supports_cod, supports_pickup: carrier.supports_pickup, supports_returns: carrier.supports_returns, is_active: carrier.is_active, ...patch } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-carriers"] }),
    onError: (error: ApiError) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader title="شركات الشحن والأسعار" description="أسعار التكلفة لكل شركة وخدمة حسب النطاق. جميع الشركات تعمل حالياً عبر المحاكي حتى يتم ربط واجهاتها." />
      {isLoading && <Skeleton className="h-96" />}
      <div className="grid gap-4 xl:grid-cols-2">
        {data?.data.map((carrier) => (
          <Card key={carrier.id}>
            <CardHeader
              title={<span className="flex items-center gap-3"><CarrierMark carrier={carrier} />{carrier.name}<Badge tone="gray" className="num">{carrier.driver}</Badge></span>}
              description={<span className="num">{carrier.shipments_count ?? 0} شحنة</span>}
              action={<Switch checked={carrier.is_active} onCheckedChange={(checked) => toggle.mutate({ carrier, patch: { is_active: checked } })} aria-label={`تفعيل ${carrier.name}`} />}
            />
            <div className="flex flex-wrap gap-4 border-b border-line px-5 py-3 text-sm">
              {(["supports_cod", "supports_pickup", "supports_returns"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2"><Switch checked={carrier[key]} onCheckedChange={(checked) => toggle.mutate({ carrier, patch: { [key]: checked } })} />{{ supports_cod: "الدفع عند الاستلام", supports_pickup: "الاستلام", supports_returns: "المرتجعات" }[key]}</label>
              ))}
            </div>
            <ul className="divide-y divide-line">
              {carrier.services?.map((service) => (
                <li key={service.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{service.name} <span className="num text-xs font-normal text-ink-subtle">({service.eta_min_days}-{service.eta_max_days} أيام · حتى {service.max_weight_kg} كجم)</span>{!service.is_active && <Badge tone="gray" className="ms-2">موقوفة</Badge>}</p>
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ carrier, service })}><Pencil />تعديل</Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {service.rates?.map((rate) => (
                      <div key={rate.id} className="rounded-md bg-surface-muted px-3 py-2 text-xs">
                        <p className="text-ink-subtle">{rate.zone.label}</p>
                        <Money value={rate.base_price} className="font-bold" />
                        <p className="text-ink-subtle">+<Money value={rate.extra_kg_price} currency={false} />/كجم</p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-3"><Button size="sm" variant="outline" onClick={() => setEditing({ carrier })}><Plus />إضافة خدمة</Button></div>
          </Card>
        ))}
      </div>
      {editing && data && <ServiceDialog carrier={editing.carrier} service={editing.service} zones={data.zones} onClose={() => setEditing(null)} />}
    </>
  );
}
