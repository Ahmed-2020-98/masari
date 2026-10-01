"use client";

import { api, ApiError, type Plan } from "@masari/api";
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, Field, Input, Money, NativeSelect, PageHeader, Switch, Textarea, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

type Form = { id?: number; name: string; slug: string; description: string; markup_type: string; markup_value: string; cod_fee: string; return_fee: string; monthly_fee: string; features: string; is_default: boolean; is_active: boolean };
const toForm = (plan?: Plan): Form => ({
  id: plan?.id, name: plan?.name ?? "", slug: plan?.slug ?? "", description: plan?.description ?? "", markup_type: plan?.markup_type ?? "percent", markup_value: String(plan?.markup_value ?? 1000),
  cod_fee: String(plan?.cod_fee.value ?? 5), return_fee: String(plan?.return_fee.value ?? 10), monthly_fee: String(plan?.monthly_fee.value ?? 0), features: plan?.features.join("\n") ?? "", is_default: plan?.is_default ?? false, is_active: plan?.is_active ?? true,
});

export default function PlansPage() {
  const client = useQueryClient();
  const { data } = useQuery({ queryKey: ["plans"], queryFn: () => api<{ data: Plan[] }>("admin/plans") });
  const [form, setForm] = useState<Form | null>(null);
  const save = useMutation({
    mutationFn: (value: Form) => api(value.id ? `admin/plans/${value.id}` : "admin/plans", { method: value.id ? "PUT" : "POST", body: { ...value, markup_value: Number(value.markup_value), cod_fee: Number(value.cod_fee), return_fee: Number(value.return_fee), monthly_fee: Number(value.monthly_fee), features: value.features.split("\n").map((line) => line.trim()).filter(Boolean) } }),
    onSuccess: () => { toast.success("تم حفظ الباقة"); client.invalidateQueries({ queryKey: ["plans"] }); setForm(null); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => form && setForm({ ...form, [key]: event.target.value });

  return (
    <>
      <PageHeader title="الباقات" description="هامش الربح ورسوم التحصيل والمرتجعات لكل باقة. تظهر الباقات المفعلة في الموقع." actions={<Button onClick={() => setForm(toForm())}><Plus />باقة جديدة</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {data?.data.map((plan) => (
          <Card key={plan.id} className="p-5">
            <div className="flex items-start justify-between">
              <div><p className="text-lg font-extrabold">{plan.name}</p><p className="text-sm text-ink-subtle">{plan.description}</p></div>
              <Button size="icon-sm" variant="ghost" onClick={() => setForm(toForm(plan))} aria-label="تعديل"><Pencil /></Button>
            </div>
            <div className="mt-3 flex gap-2">{plan.is_default && <Badge tone="green">افتراضية</Badge>}{!plan.is_active && <Badge tone="gray">موقوفة</Badge>}<Badge tone="navy"><span className="num">{plan.merchants_count ?? 0}</span> تاجر</Badge></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink-subtle">الهامش</dt><dd className="num font-bold">{plan.markup_type === "percent" ? `${(plan.markup_value ?? 0) / 100}%` : `${((plan.markup_value ?? 0) / 100).toFixed(2)} ر.س`}</dd></div>
              <div><dt className="text-ink-subtle">الاشتراك</dt><dd><Money value={plan.monthly_fee} className="font-bold" /></dd></div>
              <div><dt className="text-ink-subtle">رسوم التحصيل</dt><dd><Money value={plan.cod_fee} /></dd></div>
              <div><dt className="text-ink-subtle">رسوم المرتجع</dt><dd><Money value={plan.return_fee} /></dd></div>
            </dl>
          </Card>
        ))}
      </div>
      {form && (
        <Dialog open onOpenChange={(open) => !open && setForm(null)}>
          <DialogContent title={form.id ? "تعديل الباقة" : "باقة جديدة"} size="lg">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم" htmlFor="p-name"><Input id="p-name" value={form.name} onChange={set("name")} /></Field>
              <Field label="المعرف (slug)" htmlFor="p-slug"><Input id="p-slug" dir="ltr" value={form.slug} onChange={set("slug")} /></Field>
              <Field label="الوصف" htmlFor="p-desc" className="sm:col-span-2"><Input id="p-desc" value={form.description} onChange={set("description")} /></Field>
              <Field label="نوع الهامش" htmlFor="p-mtype"><NativeSelect id="p-mtype" value={form.markup_type} onChange={set("markup_type")}><option value="percent">نسبة (نقطة أساس: 1000 = 10%)</option><option value="fixed">مبلغ ثابت (هللة)</option></NativeSelect></Field>
              <Field label="قيمة الهامش" htmlFor="p-mval"><Input id="p-mval" type="number" value={form.markup_value} onChange={set("markup_value")} className="num" /></Field>
              <Field label="رسوم التحصيل (ر.س)" htmlFor="p-cod"><Input id="p-cod" type="number" step="0.01" value={form.cod_fee} onChange={set("cod_fee")} className="num" /></Field>
              <Field label="رسوم المرتجع (ر.س)" htmlFor="p-ret"><Input id="p-ret" type="number" step="0.01" value={form.return_fee} onChange={set("return_fee")} className="num" /></Field>
              <Field label="الاشتراك الشهري (ر.س)" htmlFor="p-mon"><Input id="p-mon" type="number" step="0.01" value={form.monthly_fee} onChange={set("monthly_fee")} className="num" /></Field>
              <Field label="المزايا (سطر لكل ميزة)" htmlFor="p-feat" className="sm:col-span-2"><Textarea id="p-feat" rows={4} value={form.features} onChange={set("features")} /></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_default} onCheckedChange={(checked) => setForm({ ...form, is_default: checked })} />الباقة الافتراضية للتسجيل</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />مفعلة</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(null)}>إلغاء</Button>
              <Button onClick={() => save.mutate(form)} loading={save.isPending}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
