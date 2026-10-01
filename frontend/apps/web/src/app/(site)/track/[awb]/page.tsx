import { backendUrl } from "@masari/api/server";
import type { Carrier, Enum, Money, ShipmentEvent } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Card, CarrierMark, cn, EnumBadge, Timeline } from "@masari/ui";
import { Check, MapPin, PackageX } from "lucide-react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { TrackForm } from "@/components/site/track-form";

type Tracking = {
  awb: string;
  reference: string;
  status: Enum;
  carrier: Carrier;
  store_name: string;
  origin: string;
  destination: string;
  recipient_name: string;
  cod: Money | null;
  steps: (Enum & { reached: boolean })[];
  events: ShipmentEvent[];
  delivered_at: string | null;
  created_at: string;
};

type Props = { params: Promise<{ awb: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { awb } = await params;
  return { title: `تتبع الشحنة ${decodeURIComponent(awb)}`, robots: { index: false } };
}

async function load(awb: string): Promise<Tracking | null> {
  const response = await fetch(backendUrl(`public/track/${encodeURIComponent(awb)}`), { headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null);
  return response?.ok ? response.json() : null;
}

export default async function TrackingResultPage({ params }: Props) {
  const awb = decodeURIComponent((await params).awb);
  const data = await load(awb);

  return (
    <>
      <SiteHeader solid />
      <section className="min-h-[70vh] bg-snow px-4 pb-24 pt-32">
        <div className="mx-auto max-w-3xl">
          <TrackForm variant="light" defaultValue={awb} />

          {!data ? (
            <Card className="mt-8 flex flex-col items-center px-6 py-16 text-center">
              <PackageX className="size-14 text-navy-200" aria-hidden />
              <h1 className="mt-4 text-xl font-extrabold text-ink">لم نعثر على شحنة بهذا الرقم</h1>
              <p className="mt-2 text-ink-muted">تأكد من رقم التتبع وحاول مرة أخرى، أو تواصل مع المتجر.</p>
            </Card>
          ) : (
            <Card className="mt-8 overflow-hidden">
              <div className="grain relative bg-navy-900 px-6 py-7 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CarrierMark carrier={data.carrier} size="lg" />
                    <div>
                      <p className="text-sm text-white/60">{data.carrier.name} · من {data.store_name}</p>
                      <h1 className="num mt-0.5 text-2xl font-extrabold tracking-wider">{data.awb}</h1>
                    </div>
                  </div>
                  <EnumBadge value={data.status} className="text-sm" />
                </div>
                <div className="mt-6 flex items-center gap-3 text-sm text-white/75">
                  <MapPin className="size-4 text-green-400" aria-hidden />
                  {data.origin}
                  <span className="h-px flex-1 border-t border-dashed border-white/25" aria-hidden />
                  {data.destination}
                </div>
              </div>

              <ol className="grid grid-cols-5 gap-1 border-b border-line px-4 py-6 sm:px-6" aria-label="مراحل الشحنة">
                {data.steps.map((step, index) => (
                  <li key={step.value} className="flex flex-col items-center gap-2 text-center">
                    <span className={cn("grid size-9 place-items-center rounded-full text-sm font-bold", step.reached ? "bg-green-500 text-navy-900" : "bg-surface-muted text-ink-subtle ring-1 ring-line")}>
                      {step.reached ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <span className="num">{index + 1}</span>}
                    </span>
                    <span className={cn("text-[11px] leading-tight sm:text-xs", step.reached ? "font-bold text-ink" : "text-ink-subtle")}>{step.label}</span>
                  </li>
                ))}
              </ol>

              <div className="grid gap-8 p-6 md:grid-cols-[1fr_220px]">
                <div>
                  <h2 className="mb-5 text-base font-extrabold text-ink">سجل الشحنة</h2>
                  <Timeline events={data.events} formatDate={formatDateTime} />
                </div>
                <dl className="space-y-4 rounded-lg bg-surface-muted p-4 text-sm">
                  <div><dt className="text-ink-subtle">المستلم</dt><dd className="font-bold">{data.recipient_name}</dd></div>
                  <div><dt className="text-ink-subtle">رقم المرجع</dt><dd className="num font-bold">{data.reference}</dd></div>
                  <div><dt className="text-ink-subtle">تاريخ الإنشاء</dt><dd className="num">{formatDateTime(data.created_at)}</dd></div>
                  {data.cod && <div><dt className="text-ink-subtle">المبلغ عند الاستلام</dt><dd className="num text-lg font-extrabold text-ink">{data.cod.formatted}</dd></div>}
                </dl>
              </div>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
