"use client";

import { api, ApiError, fileUrl, type Address, type Money as MoneyValue, type Quote, type Shipment, type StoreOrder } from "@masari/api";
import { formatPhone } from "@masari/i18n";
import { Button, Card, CardHeader, CarrierMark, cn, EmptyState, Field, Input, Money, PageHeader, Skeleton, Stepper, Switch, Textarea, toast } from "@masari/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Clock, MapPin, PackagePlus, Printer, Search, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CityCombobox } from "@/components/city-combobox";
import { useRefreshSession } from "@/lib/session";
import { useRegions } from "@/lib/use-cities";

type Recipient = { name: string; phone: string; city_id: number | null; district: string; street: string; building_no: string; short_address: string; email: string };
type Parcel = { weight_kg: string; length: string; width: string; height: string; pieces: string; contents: string; cod: boolean; cod_amount: string; declared_value: string; order_number: string; notes: string };

const emptyRecipient: Recipient = { name: "", phone: "", city_id: null, district: "", street: "", building_no: "", short_address: "", email: "" };
const emptyParcel: Parcel = { weight_kg: "1", length: "", width: "", height: "", pieces: "1", contents: "", cod: false, cod_amount: "", declared_value: "", order_number: "", notes: "" };
const STEPS = ["العناوين", "تفاصيل الطرد", "اختيار الشركة", "المراجعة"];

function orderToRecipient(order: StoreOrder): Recipient {
  return { ...emptyRecipient, name: order.customer.name, phone: order.customer.phone.replace(/^\+966/, "0"), city_id: order.customer.city_id, district: order.customer.district ?? "", street: order.customer.street ?? "" };
}

function orderToParcel(order: StoreOrder): Parcel {
  const cod = order.cod_amount.amount > 0;
  return { ...emptyParcel, weight_kg: String(order.weight_kg), cod, cod_amount: cod ? String(order.cod_amount.value) : "", order_number: order.number, contents: order.items?.map((item) => item.name).join("، ") ?? "", declared_value: String(order.total.value) };
}

function CreateShipment({ order }: { order?: StoreOrder }) {
  const orderId = order ? String(order.id) : null;
  const refreshSession = useRefreshSession();
  const regions = useRegions();
  const [step, setStep] = useState(0);
  const [senderId, setSenderId] = useState<number | null>(null);
  const [recipient, setRecipient] = useState<Recipient>(() => (order ? orderToRecipient(order) : emptyRecipient));
  const [saveRecipient, setSaveRecipient] = useState(true);
  const [parcel, setParcel] = useState<Parcel>(() => (order ? orderToParcel(order) : emptyParcel));
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Shipment | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");

  const senders = useQuery({ queryKey: ["addresses", "sender"], queryFn: () => api<{ data: Address[] }>("merchant/addresses", { query: { type: "sender" } }) });
  const savedRecipients = useQuery({
    queryKey: ["addresses", "recipient", recipientSearch],
    queryFn: () => api<{ data: Address[] }>("merchant/addresses", { query: { type: "recipient", search: recipientSearch } }),
    enabled: recipientSearch.length >= 2,
  });

  const defaultSender = senders.data?.data.find((address) => address.is_default) ?? senders.data?.data[0];
  const effectiveSenderId = senderId ?? defaultSender?.id ?? null;
  const sender = senders.data?.data.find((address) => address.id === effectiveSenderId);
  const dimensions = parcel.length && parcel.width && parcel.height ? { length: Number(parcel.length), width: Number(parcel.width), height: Number(parcel.height) } : null;
  const codAmount = parcel.cod ? Number(parcel.cod_amount || 0) : 0;

  const quotes = useQuery({
    queryKey: ["quotes", sender?.city_id, recipient.city_id, parcel.weight_kg, dimensions, codAmount],
    queryFn: () => api<{ data: Quote[]; wallet: MoneyValue }>("merchant/quotes", { method: "POST", body: { origin_city_id: sender?.city_id, destination_city_id: recipient.city_id, weight_kg: Number(parcel.weight_kg), dimensions, cod_amount: codAmount } }),
    enabled: step >= 2 && !!sender && !!recipient.city_id,
  });
  const selectedQuote = quotes.data?.data.find((quote) => quote.carrier_service_id === serviceId);

  const create = useMutation({
    mutationFn: () =>
      api<{ data: Shipment }>("merchant/shipments", {
        method: "POST",
        body: {
          carrier_service_id: serviceId,
          sender_address_id: effectiveSenderId,
          recipient: { ...recipient, email: recipient.email || null },
          save_recipient: saveRecipient,
          weight_kg: Number(parcel.weight_kg),
          dimensions,
          pieces: Number(parcel.pieces || 1),
          contents: parcel.contents || null,
          declared_value: parcel.declared_value || 0,
          cod_amount: codAmount,
          order_number: parcel.order_number || null,
          notes: parcel.notes || null,
          store_order_id: orderId ? Number(orderId) : null,
        },
      }),
    onSuccess: (result) => {
      setCreated(result.data);
      refreshSession();
      toast.success("تم إنشاء الشحنة بنجاح");
    },
    onError: (exception: ApiError) => {
      toast.error(exception.message);
      const fieldErrors = Object.fromEntries(Object.entries(exception.errors).map(([key, messages]) => [key, messages[0]]));
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).some((key) => key.startsWith("recipient"))) setStep(0);
    },
  });

  const validateStep = (): boolean => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!effectiveSenderId) next.sender = "أضف عنوان المستودع أولاً";
      if (!recipient.name.trim()) next["recipient.name"] = "اسم المستلم مطلوب";
      if (!/^0?5\d{8}$/.test(recipient.phone.replace(/\s/g, "").replace(/^\+966/, "0"))) next["recipient.phone"] = "رقم جوال سعودي غير صحيح";
      if (!recipient.city_id) next["recipient.city_id"] = "اختر مدينة المستلم";
    }
    if (step === 1) {
      const weight = Number(parcel.weight_kg);
      if (!weight || weight <= 0 || weight > 70) next.weight_kg = "أدخل وزناً بين 0.1 و 70 كجم";
      if (parcel.cod && !(Number(parcel.cod_amount) > 0)) next.cod_amount = "أدخل مبلغ التحصيل";
    }
    if (step === 2 && !serviceId) next.service = "اختر شركة الشحن";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const go = (delta: number) => {
    if (delta > 0 && !validateStep()) return;
    setStep((value) => Math.max(0, Math.min(STEPS.length - 1, value + delta)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setR = (key: keyof Recipient) => (event: React.ChangeEvent<HTMLInputElement>) => setRecipient({ ...recipient, [key]: event.target.value });
  const setP = (key: keyof Parcel) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setParcel({ ...parcel, [key]: event.target.value });

  const cityName = useMemo(() => regions.data?.flatMap((region) => region.cities).find((city) => city.id === recipient.city_id)?.name, [regions.data, recipient.city_id]);

  if (created) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-500 text-navy-900 animate-pulse-ring"><CheckCircle2 className="size-8" aria-hidden /></span>
        <h1 className="mt-5 text-2xl font-black">تم إنشاء الشحنة بنجاح</h1>
        <p className="mt-2 text-ink-muted">رقم التتبع لدى {created.carrier?.name}</p>
        <p className="num mt-1 text-3xl font-extrabold tracking-widest">{created.awb}</p>
        <p className="mt-3 text-sm text-ink-subtle">تم خصم <Money value={created.total} className="font-bold text-ink" /> من محفظتك.</p>
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          <Button asChild size="lg"><a href={fileUrl(`merchant/shipments/${created.id}/label`)} target="_blank" rel="noopener"><Printer />طباعة البوليصة</a></Button>
          <Button asChild size="lg" variant="outline"><Link href={`/dashboard/shipments/${created.id}`}>تفاصيل الشحنة</Link></Button>
        </div>
        <Button variant="link" className="mt-4" onClick={() => { setCreated(null); setRecipient(emptyRecipient); setParcel(emptyParcel); setServiceId(null); setStep(0); }}>إنشاء شحنة أخرى</Button>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="إنشاء شحنة" description={order ? `من طلب المتجر رقم ${order.number}` : "قارن الأسعار واختر الشركة الأنسب لشحنتك."} />
      <Card className="mb-4 px-5 py-4"><Stepper steps={STEPS} current={step} /></Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div>
          {step === 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader title="المرسل (المستودع)" action={<Button asChild variant="ghost" size="sm"><Link href="/dashboard/addresses">إدارة العناوين</Link></Button>} />
                <div className="p-5">
                  {senders.isLoading ? <Skeleton className="h-20" /> : senders.data?.data.length ? (
                    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="عنوان المرسل">
                      {senders.data.data.map((address) => (
                        <button key={address.id} type="button" role="radio" aria-checked={effectiveSenderId === address.id} onClick={() => setSenderId(address.id)} className={cn("rounded-lg border p-4 text-start transition", effectiveSenderId === address.id ? "border-navy-900 bg-navy-50/60 ring-2 ring-navy-900/10" : "border-line hover:border-line-strong")}>
                          <p className="font-bold">{address.label ?? address.name}</p>
                          <p className="mt-1 text-sm text-ink-muted"><MapPin className="me-1 inline size-3.5" aria-hidden />{address.city?.name} · {address.district}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="لا يوجد عنوان مستودع" description="أضف عنوان الاستلام الخاص بمتجرك لتتمكن من الشحن." action={<Button asChild><Link href="/dashboard/addresses?new=sender">إضافة عنوان</Link></Button>} className="py-6" />
                  )}
                  {errors.sender && <p className="mt-2 text-sm text-rose-600">{errors.sender}</p>}
                </div>
              </Card>

              <Card>
                <CardHeader title="المستلم" />
                <div className="space-y-4 p-5">
                  <div className="relative">
                    <Input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="ابحث في العملاء المحفوظين بالاسم أو الجوال" startIcon={<Search />} aria-label="بحث في العملاء المحفوظين" />
                    {recipientSearch.length >= 2 && !!savedRecipients.data?.data.length && (
                      <ul className="absolute inset-x-0 top-12 z-10 max-h-60 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-pop">
                        {savedRecipients.data.data.map((address) => (
                          <li key={address.id}>
                            <button type="button" className="w-full rounded-sm px-3 py-2 text-start hover:bg-surface-muted" onClick={() => {
                              setRecipient({ ...emptyRecipient, name: address.name, phone: address.phone.replace(/^\+966/, "0"), city_id: address.city_id, district: address.district ?? "", street: address.street ?? "", building_no: address.building_no ?? "", short_address: address.short_address ?? "" });
                              setRecipientSearch("");
                            }}>
                              <span className="font-bold">{address.name}</span> <span className="num text-sm text-ink-subtle">{formatPhone(address.phone)}</span> · <span className="text-sm text-ink-subtle">{address.city?.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="اسم المستلم" htmlFor="r-name" required error={errors["recipient.name"]}><Input id="r-name" value={recipient.name} onChange={setR("name")} aria-invalid={!!errors["recipient.name"]} /></Field>
                    <Field label="رقم الجوال" htmlFor="r-phone" required error={errors["recipient.phone"]}><Input id="r-phone" value={recipient.phone} onChange={setR("phone")} inputMode="tel" dir="ltr" placeholder="05X XXX XXXX" className="num text-end" aria-invalid={!!errors["recipient.phone"]} /></Field>
                    <Field label="المدينة" htmlFor="r-city" required error={errors["recipient.city_id"]}>
                      {regions.data ? <CityCombobox id="r-city" regions={regions.data} value={recipient.city_id} onChange={(cityId) => setRecipient({ ...recipient, city_id: cityId })} invalid={!!errors["recipient.city_id"]} /> : <Skeleton className="h-11" />}
                    </Field>
                    <Field label="الحي" htmlFor="r-district"><Input id="r-district" value={recipient.district} onChange={setR("district")} /></Field>
                    <Field label="الشارع" htmlFor="r-street"><Input id="r-street" value={recipient.street} onChange={setR("street")} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="رقم المبنى" htmlFor="r-building"><Input id="r-building" value={recipient.building_no} onChange={setR("building_no")} className="num" /></Field>
                      <Field label="العنوان الوطني" htmlFor="r-short" hint="مثال: RRRD2929"><Input id="r-short" value={recipient.short_address} onChange={setR("short_address")} dir="ltr" className="num uppercase" maxLength={8} /></Field>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-navy-900" checked={saveRecipient} onChange={(event) => setSaveRecipient(event.target.checked)} />حفظ المستلم في قائمة العملاء</label>
                </div>
              </Card>
            </div>
          )}

          {step === 1 && (
            <Card>
              <CardHeader title="تفاصيل الطرد" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="الوزن" htmlFor="p-weight" required error={errors.weight_kg}><Input id="p-weight" type="number" inputMode="decimal" step="0.1" min="0.1" max="70" value={parcel.weight_kg} onChange={setP("weight_kg")} endAdornment="كجم" className="num" /></Field>
                <Field label="عدد القطع" htmlFor="p-pieces"><Input id="p-pieces" type="number" min="1" max="50" value={parcel.pieces} onChange={setP("pieces")} className="num" /></Field>
                <Field label="الأبعاد (اختياري)" htmlFor="p-length" hint="الطول × العرض × الارتفاع بالسنتيمتر — يُحسب الوزن الحجمي تلقائياً." className="sm:col-span-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input id="p-length" type="number" placeholder="الطول" value={parcel.length} onChange={setP("length")} className="num" aria-label="الطول" />
                    <Input type="number" placeholder="العرض" value={parcel.width} onChange={setP("width")} className="num" aria-label="العرض" />
                    <Input type="number" placeholder="الارتفاع" value={parcel.height} onChange={setP("height")} className="num" aria-label="الارتفاع" />
                  </div>
                </Field>
                <Field label="المحتوى" htmlFor="p-contents"><Input id="p-contents" value={parcel.contents} onChange={setP("contents")} placeholder="مثال: عطور" /></Field>
                <Field label="رقم الطلب" htmlFor="p-order"><Input id="p-order" value={parcel.order_number} onChange={setP("order_number")} className="num" /></Field>
                <div className="rounded-lg border border-line p-4 sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>
                      <span className="block font-bold">الدفع عند الاستلام</span>
                      <span className="text-sm text-ink-subtle">يحصّل المندوب المبلغ من العميل ويُضاف لمحفظتك.</span>
                    </span>
                    <Switch checked={parcel.cod} onCheckedChange={(checked) => setParcel({ ...parcel, cod: checked })} aria-label="الدفع عند الاستلام" />
                  </label>
                  {parcel.cod && (
                    <Field label="مبلغ التحصيل" htmlFor="p-cod" required error={errors.cod_amount} className="mt-4 max-w-xs">
                      <Input id="p-cod" type="number" inputMode="decimal" min="1" value={parcel.cod_amount} onChange={setP("cod_amount")} endAdornment="ر.س" className="num" autoFocus />
                    </Field>
                  )}
                </div>
                <Field label="ملاحظات للمندوب" htmlFor="p-notes" className="sm:col-span-2"><Textarea id="p-notes" rows={2} value={parcel.notes} onChange={setP("notes")} /></Field>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader title="اختر شركة الشحن" description={`${sender?.city?.name ?? ""} ← ${cityName ?? ""} · ${parcel.weight_kg} كجم${parcel.cod ? " · دفع عند الاستلام" : ""}`} />
              <div className="p-3" role="radiogroup" aria-label="شركات الشحن">
                {quotes.isLoading && <div className="space-y-2 p-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>}
                {quotes.isError && <p className="p-4 text-rose-600">{quotes.error.message}</p>}
                {quotes.data?.data.length === 0 && <EmptyState title="لا توجد خدمات متاحة" description="لا تغطي الشركات هذا المسار بهذا الوزن حالياً." />}
                <ul className="space-y-2">
                  {quotes.data?.data.map((quote) => {
                    const active = serviceId === quote.carrier_service_id;
                    return (
                      <li key={quote.carrier_service_id}>
                        <button type="button" role="radio" aria-checked={active} onClick={() => setServiceId(quote.carrier_service_id)} className={cn("flex w-full flex-wrap items-center gap-4 rounded-lg border p-4 text-start transition", active ? "border-green-500 bg-green-50/60 ring-4 ring-green-500/10" : "border-line hover:border-line-strong")}>
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", active ? "border-green-600" : "border-line-strong")} aria-hidden>{active && <span className="size-2.5 rounded-full bg-green-600" />}</span>
                          <CarrierMark carrier={quote.carrier} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold">{quote.carrier.name} <span className="text-sm font-normal text-ink-subtle">· {quote.service.name}</span></p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-ink-subtle">
                              <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{quote.eta.label}</span>
                              {quote.is_cheapest && <span className="flex items-center gap-1 font-bold text-green-700"><BadgeCheck className="size-3.5" aria-hidden />الأوفر</span>}
                              {quote.is_fastest && <span className="flex items-center gap-1 font-bold text-indigo-600"><Zap className="size-3.5" aria-hidden />الأسرع</span>}
                            </p>
                          </div>
                          <div className="text-end">
                            <Money value={quote.total} className="text-xl font-extrabold" />
                            <p className="text-[11px] text-ink-subtle">شامل الضريبة</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {errors.service && <p className="p-2 text-sm text-rose-600">{errors.service}</p>}
              </div>
            </Card>
          )}

          {step === 3 && selectedQuote && (
            <Card>
              <CardHeader title="مراجعة وتأكيد" />
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-lg border border-line p-4"><p className="text-xs font-bold text-ink-subtle">من</p><p className="mt-1 font-bold">{sender?.name}</p><p className="text-sm text-ink-muted">{sender?.city?.name} · {sender?.district}</p></div>
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-4"><p className="text-xs font-bold text-ink-subtle">إلى</p><p className="mt-1 font-bold">{recipient.name}</p><p className="num text-sm text-ink-muted">{recipient.phone}</p><p className="text-sm text-ink-muted">{cityName} · {recipient.district}</p></div>
                <div className="flex items-center gap-3 rounded-lg border border-line p-4 md:col-span-2">
                  <CarrierMark carrier={selectedQuote.carrier} />
                  <div className="flex-1"><p className="font-bold">{selectedQuote.carrier.name} · {selectedQuote.service.name}</p><p className="text-sm text-ink-subtle">{selectedQuote.eta.label} · الوزن المحتسب <span className="num">{selectedQuote.chargeable_weight_kg}</span> كجم</p></div>
                  {parcel.cod && <div className="text-end"><p className="text-xs text-ink-subtle">تحصيل</p><p className="num font-bold">{Number(parcel.cod_amount).toFixed(2)} ر.س</p></div>}
                </div>
              </div>
            </Card>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => go(-1)} disabled={step === 0}><ArrowRight />السابق</Button>
            {step < 3 ? (
              <Button variant="navy" onClick={() => go(1)}>التالي<ArrowLeft /></Button>
            ) : (
              <Button size="lg" onClick={() => create.mutate()} loading={create.isPending} disabled={!selectedQuote}><PackagePlus />تأكيد وإنشاء البوليصة</Button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="sticky top-20 p-5">
            <p className="font-bold">ملخص التكلفة</p>
            {selectedQuote ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-muted">الشحن</dt><dd><Money value={selectedQuote.shipping} /></dd></div>
                {selectedQuote.cod_fee.amount > 0 && <div className="flex justify-between"><dt className="text-ink-muted">رسوم التحصيل</dt><dd><Money value={selectedQuote.cod_fee} /></dd></div>}
                <div className="flex justify-between"><dt className="text-ink-muted">الضريبة (15%)</dt><dd><Money value={selectedQuote.vat} /></dd></div>
                <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-bold">الإجمالي</dt><dd><Money value={selectedQuote.total} className="font-extrabold" /></dd></div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-ink-subtle">اختر شركة الشحن لعرض التكلفة النهائية.</p>
            )}
            {quotes.data?.wallet && (
              <div className={cn("mt-5 flex items-center justify-between rounded-md p-3 text-sm", selectedQuote && quotes.data.wallet.amount < selectedQuote.total.amount ? "bg-rose-50 text-rose-700" : "bg-surface-muted")}>
                <span className="flex items-center gap-1.5"><Wallet className="size-4" aria-hidden />رصيد المحفظة</span>
                <Money value={quotes.data.wallet} className="font-bold" />
              </div>
            )}
            {selectedQuote && quotes.data && quotes.data.wallet.amount < selectedQuote.total.amount && (
              <Button asChild variant="soft" className="mt-3 w-full"><Link href="/dashboard/wallet">شحن الرصيد</Link></Button>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

/** Loads the store order (when shipping one) before mounting the form so its state starts prefilled. */
function CreateShipmentLoader() {
  const orderId = useSearchParams().get("order");
  const order = useQuery({
    queryKey: ["order-prefill", orderId],
    queryFn: () => api<{ data: StoreOrder }>(`merchant/orders/${orderId}`),
    enabled: !!orderId,
    select: (result) => result.data,
  });

  if (orderId && order.isLoading) return <Skeleton className="h-96" />;

  return <CreateShipment key={orderId ?? "new"} order={order.data} />;
}

export default function Page() {
  return <Suspense><CreateShipmentLoader /></Suspense>;
}
