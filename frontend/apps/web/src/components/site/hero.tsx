import { Button, CarrierMark } from "@masari/ui";
import { ArrowLeft, BadgeCheck, Calculator, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { RouteMap } from "./route-map";
import { TrackForm } from "./track-form";

const sample = [
  { code: "spl", name: "سبل", name_en: "SPL", brand_color: "#0B7A3E", price: "18.40", eta: "3-5 أيام", best: "الأرخص" },
  { code: "smsa", name: "سمسا", name_en: "SMSA", brand_color: "#1E3A8A", price: "21.85", eta: "2-4 أيام" },
  { code: "aramex", name: "أرامكس", name_en: "Aramex", brand_color: "#E1251B", price: "29.60", eta: "1-2 يوم", best: "الأسرع" },
];

export function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-navy-900 pb-20 pt-32 text-white md:pb-28 md:pt-40">
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/3 size-[640px] rounded-full bg-green-500/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -end-40 size-[520px] rounded-full bg-teal-600/30 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 md:px-8 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="inline-flex animate-rise items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/80">
            <span className="size-2 rounded-full bg-green-400 animate-pulse-ring" aria-hidden />
            أكثر من 8 شركات شحن · بدون عقود · بدون اشتراك
          </p>

          <h1 className="mt-6 animate-rise text-[44px] font-black leading-[1.12] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-[76px]">
            شحن أسهل<span className="text-green-400">.</span>
            <br />
            أسعار أفضل<span className="text-green-400">.</span>
          </h1>

          <p className="mt-6 max-w-xl animate-rise text-lg leading-8 text-white/70 [animation-delay:160ms] md:text-xl">
            قارن أسعار شركات الشحن في ثوانٍ، أنشئ البوالص وتتبع شحناتك، واستلم مبالغ الدفع عند الاستلام في محفظتك — كل ذلك من لوحة واحدة.
          </p>

          <div className="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
            <Button asChild size="lg" className="shadow-glow">
              <Link href="/register">
                ابدأ الشحن الآن
                <ArrowLeft />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:border-white hover:bg-white/10">
              <Link href="/#calculator">
                <Calculator />
                احسب تكلفة شحنتك
              </Link>
            </Button>
          </div>

          <div className="mt-10 max-w-lg animate-rise [animation-delay:320ms]">
            <TrackForm />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <RouteMap className="w-full" />

          <div className="absolute -start-2 top-6 w-[250px] animate-rise rounded-xl border border-white/10 bg-white p-4 text-ink shadow-pop [animation-delay:400ms] sm:start-2 sm:w-[290px]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">مقارنة الأسعار</p>
              <span className="num text-xs text-ink-subtle">الرياض ← جدة · 1 كجم</span>
            </div>
            <ul className="mt-3 space-y-2">
              {sample.map((carrier) => (
                <li key={carrier.code} className="flex items-center gap-3 rounded-md border border-line px-2.5 py-2">
                  <CarrierMark carrier={carrier} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-tight">{carrier.name}</p>
                    <p className="text-xs text-ink-subtle">{carrier.eta}</p>
                  </div>
                  <div className="text-end">
                    <p className="num text-sm font-bold">{carrier.price} <span className="text-[10px] font-medium text-ink-subtle">ر.س</span></p>
                    {carrier.best && <p className="text-[11px] font-bold text-green-700">{carrier.best}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="absolute -end-2 bottom-4 w-[240px] animate-rise rounded-xl border border-white/10 bg-navy-800/90 p-4 shadow-pop backdrop-blur [animation-delay:560ms] sm:end-2 sm:w-[270px]">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Truck className="size-4 text-green-400" aria-hidden />
              <span className="num tracking-wider">SMS260930496747</span>
            </div>
            <p className="mt-2 font-bold">الشحنة مع المندوب للتوصيل</p>
            <div className="mt-3 flex items-center gap-1.5" aria-hidden>
              {[1, 1, 1, 1, 0].map((done, index) => (
                <span key={index} className={`h-1.5 flex-1 rounded-full ${done ? "bg-green-400" : "bg-white/15"}`} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/60">
              <span className="flex items-center gap-1"><PackageCheck className="size-3.5" aria-hidden /> الدفع عند الاستلام</span>
              <span className="num font-bold text-white">230.00 ر.س</span>
            </div>
          </div>

          <div className="absolute end-1/3 top-0 hidden animate-rise items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-navy-900 shadow-glow [animation-delay:700ms] md:flex">
            <BadgeCheck className="size-4" aria-hidden />
            تم التسليم خلال 36 ساعة
          </div>
        </div>
      </div>
    </section>
  );
}
