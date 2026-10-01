"use client";

import { api, type Quote, type Region } from "@masari/api";
import { Button, CarrierMark, Field, Input, Money, Skeleton, Switch } from "@masari/ui";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeftRight, Clock, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CityCombobox } from "../city-combobox";
import { SectionHeading } from "./sections";

export function RateCalculator({ regions }: { regions: Region[] }) {
  const riyadh = regions.flatMap((region) => region.cities).find((city) => city.name_en === "Riyadh")?.id ?? null;
  const jeddah = regions.flatMap((region) => region.cities).find((city) => city.name_en === "Jeddah")?.id ?? null;
  const [origin, setOrigin] = useState<number | null>(riyadh);
  const [destination, setDestination] = useState<number | null>(jeddah);
  const [weight, setWeight] = useState("1");
  const [cod, setCod] = useState(false);

  const quote = useMutation({
    mutationFn: () => api<{ data: Quote[] }>("public/quote", { method: "POST", body: { origin_city_id: origin, destination_city_id: destination, weight_kg: Number(weight), cod } }),
  });

  return (
    <section id="calculator" aria-labelledby="calc-title" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading id="calc-title" eyebrow="حاسبة الأسعار" title="اعرف تكلفة شحنتك قبل التسجيل" description="أسعار شاملة ضريبة القيمة المضافة وفق الباقة الأساسية." />

        <div className="mt-12 grid gap-6 lg:grid-cols-[400px_1fr]">
          <form
            className="rounded-2xl border border-line bg-snow p-6"
            onSubmit={(event) => {
              event.preventDefault();
              quote.mutate();
            }}
          >
            <div className="space-y-4">
              <Field label="من مدينة" htmlFor="calc-origin">
                <CityCombobox id="calc-origin" regions={regions} value={origin} onChange={setOrigin} />
              </Field>
              <div className="flex justify-center">
                <button type="button" onClick={() => { setOrigin(destination); setDestination(origin); }} className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink-subtle transition hover:rotate-180 hover:text-ink" aria-label="تبديل المدن">
                  <ArrowLeftRight className="size-4 rotate-90" />
                </button>
              </div>
              <Field label="إلى مدينة" htmlFor="calc-destination">
                <CityCombobox id="calc-destination" regions={regions} value={destination} onChange={setDestination} />
              </Field>
              <Field label="الوزن" htmlFor="calc-weight">
                <Input id="calc-weight" type="number" inputMode="decimal" min="0.1" max="70" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} endAdornment="كجم" className="num" />
              </Field>
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-line bg-white px-4 py-3">
                <span className="text-sm font-medium">الدفع عند الاستلام</span>
                <Switch checked={cod} onCheckedChange={setCod} aria-label="الدفع عند الاستلام" />
              </label>
            </div>
            <Button type="submit" className="mt-6 w-full" size="lg" loading={quote.isPending} disabled={!origin || !destination || !Number(weight)}>
              قارن الأسعار
            </Button>
          </form>

          <div className="rounded-2xl border border-line bg-white p-2" aria-live="polite">
            {quote.isPending && (
              <div className="space-y-2 p-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>
            )}
            {!quote.isPending && !quote.data && (
              <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-8 text-center text-ink-subtle">
                <PackageSearch className="size-12 text-navy-200" aria-hidden />
                <p>اختر المدن والوزن ثم اضغط «قارن الأسعار» لعرض أسعار جميع الشركات.</p>
              </div>
            )}
            {quote.isError && <p className="p-6 text-rose-600">{quote.error.message}</p>}
            {quote.data && (
              <ul className="divide-y divide-line">
                {quote.data.data.map((item, index) => (
                  <li key={item.carrier_service_id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                    <CarrierMark carrier={item.carrier} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">
                        {item.carrier.name}
                        <span className="ms-2 text-sm font-normal text-ink-subtle">{item.service.name}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-subtle"><Clock className="size-3.5" aria-hidden />{item.eta.label}</p>
                    </div>
                    {index === 0 && <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">الأوفر</span>}
                    <Money value={item.total} className="text-xl font-extrabold text-ink" />
                  </li>
                ))}
                {quote.data.data.length === 0 && <li className="p-8 text-center text-ink-subtle">لا تتوفر خدمات لهذا المسار حالياً.</li>}
              </ul>
            )}
            {quote.data && quote.data.data.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4">
                <p className="text-sm text-ink-subtle">الأسعار أقل في الباقات الاحترافية والأعمال.</p>
                <Button asChild variant="navy"><Link href="/register">اشحن بهذا السعر الآن</Link></Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
