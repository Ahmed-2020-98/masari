"use client";

import { api, ApiError, type Address } from "@masari/api";
import { formatPhone } from "@masari/i18n";
import {
  Badge, Button, Card, Dialog, DialogContent, DialogFooter, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, Field, Input, Segmented, Skeleton, Textarea, toast,
  PageHeader,
} from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, MoreVertical, Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CityCombobox } from "@/components/city-combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRegions } from "@/lib/use-cities";

type Form = { type: "sender" | "recipient"; label: string; name: string; phone: string; email: string; city_id: number | null; district: string; street: string; building_no: string; postal_code: string; short_address: string; notes: string; is_default: boolean };
const empty = (type: Form["type"]): Form => ({ type, label: "", name: "", phone: "", email: "", city_id: null, district: "", street: "", building_no: "", postal_code: "", short_address: "", notes: "", is_default: false });

function AddressDialog({ initial, id, onClose }: { initial: Form; id?: number; onClose: () => void }) {
  const client = useQueryClient();
  const regions = useRegions();
  const [form, setForm] = useState(initial);
  const save = useMutation({
    mutationFn: () => api(id ? `merchant/addresses/${id}` : "merchant/addresses", { method: id ? "PUT" : "POST", body: { ...form, email: form.email || null } }),
    onSuccess: () => { toast.success("تم حفظ العنوان"); client.invalidateQueries({ queryKey: ["addresses"] }); onClose(); },
  });
  const error = save.error instanceof ApiError ? save.error : null;
  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={id ? "تعديل العنوان" : form.type === "sender" ? "إضافة مستودع / عنوان استلام" : "إضافة عميل"} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          {form.type === "sender" && <Field label="اسم العنوان" htmlFor="a-label" hint="مثال: المستودع الرئيسي" className="sm:col-span-2"><Input id="a-label" value={form.label} onChange={set("label")} /></Field>}
          <Field label="اسم جهة الاتصال" htmlFor="a-name" required error={error?.field("name")}><Input id="a-name" value={form.name} onChange={set("name")} /></Field>
          <Field label="رقم الجوال" htmlFor="a-phone" required error={error?.field("phone")}><Input id="a-phone" value={form.phone} onChange={set("phone")} dir="ltr" className="num text-end" inputMode="tel" placeholder="05X XXX XXXX" /></Field>
          <Field label="المدينة" htmlFor="a-city" required error={error?.field("city_id")}>{regions.data ? <CityCombobox id="a-city" regions={regions.data} value={form.city_id} onChange={(cityId) => setForm({ ...form, city_id: cityId })} /> : <Skeleton className="h-11" />}</Field>
          <Field label="الحي" htmlFor="a-district"><Input id="a-district" value={form.district} onChange={set("district")} /></Field>
          <Field label="الشارع" htmlFor="a-street"><Input id="a-street" value={form.street} onChange={set("street")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم المبنى" htmlFor="a-building"><Input id="a-building" value={form.building_no} onChange={set("building_no")} className="num" /></Field>
            <Field label="الرمز البريدي" htmlFor="a-postal"><Input id="a-postal" value={form.postal_code} onChange={set("postal_code")} className="num" /></Field>
          </div>
          <Field label="العنوان الوطني المختصر" htmlFor="a-short"><Input id="a-short" value={form.short_address} onChange={set("short_address")} dir="ltr" className="num uppercase" maxLength={8} /></Field>
          <Field label="البريد الإلكتروني" htmlFor="a-email" error={error?.field("email")}><Input id="a-email" type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="ملاحظات" htmlFor="a-notes" className="sm:col-span-2"><Textarea id="a-notes" rows={2} value={form.notes} onChange={set("notes")} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="size-4 accent-navy-900" checked={form.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} />تعيين كعنوان افتراضي</label>
        </div>
        {error && !Object.keys(error.errors).length && <p className="mt-3 text-sm text-rose-600">{error.message}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddressesPage() {
  const params = useSearchParams();
  const client = useQueryClient();
  const [type, setType] = useState<"sender" | "recipient">("sender");
  const [editing, setEditing] = useState<{ form: Form; id?: number } | null>(() => (params.get("new") === "sender" ? { form: { ...empty("sender"), is_default: true } } : null));
  const [deleting, setDeleting] = useState<Address | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["addresses", type, "list"], queryFn: () => api<{ data: Address[] }>("merchant/addresses", { query: { type } }) });

  const remove = useMutation({
    mutationFn: (address: Address) => api(`merchant/addresses/${address.id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("تم حذف العنوان"); client.invalidateQueries({ queryKey: ["addresses"] }); setDeleting(null); },
  });

  const toForm = (address: Address): Form => ({
    type: address.type, label: address.label ?? "", name: address.name, phone: address.phone.replace(/^\+966/, "0"), email: address.email ?? "", city_id: address.city_id,
    district: address.district ?? "", street: address.street ?? "", building_no: address.building_no ?? "", postal_code: address.postal_code ?? "", short_address: address.short_address ?? "", notes: address.notes ?? "", is_default: address.is_default,
  });

  return (
    <>
      <PageHeader title="العناوين" description="عناوين المستودعات للاستلام، ودفتر العملاء لتسريع إنشاء الشحنات." actions={<Button onClick={() => setEditing({ form: empty(type) })}><Plus />{type === "sender" ? "إضافة مستودع" : "إضافة عميل"}</Button>} />
      <Segmented value={type} onChange={setType} className="mb-4" options={[{ value: "sender", label: "المستودعات" }, { value: "recipient", label: "العملاء" }]} />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40" />)}</div>
      ) : !data?.data.length ? (
        <Card><EmptyState icon={type === "sender" ? <Warehouse /> : <MapPin />} title={type === "sender" ? "لا توجد مستودعات" : "لا يوجد عملاء محفوظون"} description={type === "sender" ? "أضف عنوان المستودع الذي تستلم منه شركات الشحن طرودك." : "يُحفظ العملاء تلقائياً عند إنشاء الشحنات."} action={<Button onClick={() => setEditing({ form: { ...empty(type), is_default: true } })}>إضافة</Button>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((address) => (
            <Card key={address.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold">{address.label ?? address.name}{address.is_default && <Badge tone="green">افتراضي</Badge>}</p>
                  {address.label && <p className="text-sm text-ink-muted">{address.name}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="grid size-9 place-items-center rounded-md hover:bg-surface-muted" aria-label="خيارات"><MoreVertical className="size-4" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setEditing({ form: toForm(address), id: address.id })}><Pencil />تعديل</DropdownMenuItem>
                    <DropdownMenuItem tone="danger" onSelect={() => setDeleting(address)}><Trash2 />حذف</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="num mt-3 text-sm text-ink-muted" dir="ltr" style={{ textAlign: "right" }}>{formatPhone(address.phone)}</p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{[address.city?.name, address.district, address.street, address.building_no].filter(Boolean).join("، ")}</p>
            </Card>
          ))}
        </div>
      )}
      {editing && <AddressDialog initial={editing.form} id={editing.id} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)} title="حذف العنوان؟" description="لن يؤثر ذلك على الشحنات السابقة." confirmLabel="حذف" loading={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting)} />
    </>
  );
}

export default function Page() {
  return <Suspense><AddressesPage /></Suspense>;
}
