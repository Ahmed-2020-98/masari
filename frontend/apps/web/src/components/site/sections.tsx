import type { Carrier, Plan } from "@masari/api";
import { BrandPattern, Button, CarrierMark, cn } from "@masari/ui";
import {
  ArrowLeft, BadgeCheck, Banknote, Boxes, Check, ChevronDown, FileSpreadsheet, Headset, MapPinned, PlugZap, RotateCcw, Scale, Wallet,
} from "lucide-react";
import Link from "next/link";
import { Counter } from "./counter";

/* ------------------------------ Carriers strip ------------------------------ */

export function CarriersStrip({ carriers }: { carriers: Carrier[] }) {
  const loop = [...carriers, ...carriers, ...carriers];

  return (
    <section id="carriers" aria-labelledby="carriers-title" className="border-b border-line bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 id="carriers-title" className="text-center text-sm font-bold text-ink-subtle">نشحن لك مع أفضل شركات الشحن المحلية والدولية</h2>
      </div>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_12%,black_88%,transparent)]">
        <ul className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {loop.map((carrier, index) => (
            <li key={`${carrier.code}-${index}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3" aria-hidden={index >= carriers.length}>
              <CarrierMark carrier={carrier} />
              <span className="whitespace-nowrap font-bold text-ink">{carrier.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------- Stats ---------------------------------- */

export function Stats({ stats }: { stats: { label: string; value: number; suffix?: string }[] }) {
  return (
    <section aria-label="أرقام مساري" className="bg-white">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 py-14 md:grid-cols-4 md:px-8">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1 px-4 py-4 text-center">
            <dd className="num text-4xl font-black text-navy-900 md:text-5xl">
              <Counter value={stat.value} />
              <span className="text-green-500">{stat.suffix}</span>
            </dd>
            <dt className="text-[15px] font-medium text-ink-subtle">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------- How it works ------------------------------ */

const steps = [
  { title: "سجّل مجاناً", body: "أنشئ حسابك برقم جوالك خلال دقيقة، بدون عقود أو اشتراكات إلزامية." },
  { title: "اشحن محفظتك", body: "ادفع بمدى أو Apple Pay أو التحويل البنكي، وادفع فقط مقابل الشحنات التي تنشئها." },
  { title: "قارن واشحن", body: "اختر الشركة الأنسب سعراً وسرعة، اطبع البوليصة وتابع شحنتك حتى باب عميلك." },
];

export function HowItWorks() {
  return (
    <section id="solutions" aria-labelledby="how-title" className="bg-snow py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading id="how-title" eyebrow="كيف يعمل مساري" title="ثلاث خطوات تفصلك عن أول شحنة" />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-line bg-white p-7 shadow-card">
              <span className="num grid size-14 place-items-center rounded-2xl bg-navy-900 text-2xl font-black text-green-400">{index + 1}</span>
              <h3 className="mt-5 text-xl font-extrabold text-ink">{step.title}</h3>
              <p className="mt-2 leading-7 text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------- Features -------------------------------- */

const features = [
  { icon: Scale, title: "مقارنة فورية للأسعار", body: "شاهد أسعار ومدة التوصيل لكل الشركات جنباً إلى جنب، واختر الأنسب لكل شحنة.", wide: true },
  { icon: Banknote, title: "الدفع عند الاستلام", body: "حصّل مبالغ طلباتك وتضاف لمحفظتك مباشرة بعد توريدها." },
  { icon: Wallet, title: "محفظة ذكية", body: "رصيد واحد لكل الشركات مع كشف حساب تفصيلي وفواتير ضريبية شهرية." },
  { icon: PlugZap, title: "ربط سلة وزد", body: "استقبل طلبات متجرك تلقائياً وأنشئ البوالص بضغطة زر." },
  { icon: MapPinned, title: "تتبع لحظي", body: "تابع كل شحناتك من لوحة واحدة وشارك رابط التتبع مع عملائك." },
  { icon: FileSpreadsheet, title: "رفع جماعي", body: "ارفع ملف Excel وأنشئ مئات البوالص في دقائق." },
  { icon: RotateCcw, title: "مرتجعات واستلام", body: "أنشئ شحنات الإرجاع وجدول استلام الطرود من مستودعك." },
  { icon: Headset, title: "دعم فني متواصل", body: "فريق سعودي يتابع معك أي تأخير أو مشكلة مع شركات الشحن، عبر التذاكر والواتساب.", span: true },
];

export function Features() {
  return (
    <section aria-labelledby="features-title" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading id="features-title" eyebrow="لماذا مساري" title="كل ما يحتاجه متجرك للشحن في منصة واحدة" description="صممنا مساري ليوفر وقتك ومالك، من أول بوليصة حتى وصول مبلغ التحصيل إلى حسابك." />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <li
              key={feature.title}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-line p-6 transition duration-300 hover:-translate-y-1 hover:shadow-pop",
                feature.wide ? "bg-navy-900 text-white sm:col-span-2 lg:row-span-2" : "bg-snow",
                "span" in feature && feature.span && "sm:col-span-2",
              )}
            >
              <span className={cn("grid size-12 place-items-center rounded-xl", feature.wide ? "bg-green-500 text-navy-900" : "bg-white text-green-700 shadow-card")}>
                <feature.icon className="size-6" aria-hidden />
              </span>
              <h3 className={cn("mt-5 font-extrabold", feature.wide ? "text-2xl md:text-3xl" : "text-lg text-ink")}>{feature.title}</h3>
              <p className={cn("mt-2 leading-7", feature.wide ? "max-w-md text-white/70" : "text-ink-muted")}>{feature.body}</p>
              {feature.wide && <CompareIllustration />}
              {index === 0 && <BrandPattern count={4} className="pointer-events-none absolute -bottom-2 -start-6 w-72 text-white opacity-30" animated={false} />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CompareIllustration() {
  const rows = [
    { name: "سبل", color: "#0B7A3E", width: "58%", price: "18.40" },
    { name: "سمسا", color: "#1E3A8A", width: "70%", price: "21.85" },
    { name: "جي آند تي", color: "#D7141A", width: "74%", price: "22.90" },
    { name: "أرامكس", color: "#E1251B", width: "92%", price: "29.60" },
  ];

  return (
    <div className="relative z-10 mt-8 space-y-3" aria-hidden>
      {rows.map((row, index) => (
        <div key={row.name} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-white/70">{row.name}</span>
          <div className="h-8 flex-1 overflow-hidden rounded-md bg-white/5">
            <div className="flex h-full items-center justify-end rounded-md px-2 transition-all duration-700 group-hover:opacity-100" style={{ width: row.width, backgroundColor: index === 0 ? "#00C48C" : "rgb(255 255 255 / 0.12)" }}>
              <span className={cn("num text-xs font-bold", index === 0 ? "text-navy-900" : "text-white/80")}>{row.price}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Integrations ------------------------------ */

export function Integrations() {
  return (
    <section aria-labelledby="integrations-title" className="grain relative overflow-hidden bg-navy-900 py-20 text-white md:py-28">
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold text-green-400">الربط والتكامل</p>
          <h2 id="integrations-title" className="mt-3 text-3xl font-black leading-tight md:text-5xl">طلبات متجرك تصل تلقائياً، والبوالص جاهزة</h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/70">اربط متجرك في سلة أو زد بضغطة زر، أو استخدم واجهة API وWebhooks للربط مع أي نظام — ويُحدَّث رقم التتبع في متجرك تلقائياً.</p>
          <ul className="mt-8 space-y-3">
            {["استيراد تلقائي للطلبات مع بيانات العميل والمدينة", "شحن تلقائي بالشركة والمستودع الافتراضي", "تحديث حالة الطلب ورقم التتبع في متجرك", "Webhooks موقّعة لكل تغيير في حالة الشحنة"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/85">
                <span className="grid size-6 place-items-center rounded-full bg-green-500 text-navy-900"><Check className="size-4" strokeWidth={3} aria-hidden /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <IntegrationTile name="سلة" en="Salla" color="#004956" accent="#BAF3E6" />
            <IntegrationTile name="زد" en="Zid" color="#5B2E91" accent="#E9DDFB" />
          </div>
          <pre dir="ltr" className="num mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-navy-950 p-5 text-[13px] leading-6 text-white/80 scrollbar-thin">
            <span className="text-green-400">POST</span> /api/v1/merchant/shipments{"\n"}
            <span className="text-white/40">Authorization: Bearer ••••••</span>{"\n\n"}
            {"{"}{"\n"}
            {"  "}<span className="text-sky-300">&quot;carrier_service_id&quot;</span>: 3,{"\n"}
            {"  "}<span className="text-sky-300">&quot;recipient&quot;</span>: {"{ "}<span className="text-sky-300">&quot;city_id&quot;</span>: 11 {"}"},{"\n"}
            {"  "}<span className="text-sky-300">&quot;cod_amount&quot;</span>: 230{"\n"}
            {"}"}{"\n"}
            <span className="text-white/40">→ 201</span> {"{ "}<span className="text-sky-300">&quot;awb&quot;</span>: <span className="text-amber-300">&quot;SPL261001884210&quot;</span>{" }"}
          </pre>
        </div>
      </div>
    </section>
  );
}

function IntegrationTile({ name, en, color, accent }: { name: string; en: string; color: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <span className="grid size-14 place-items-center rounded-xl text-xl font-black" style={{ backgroundColor: accent, color }}>{name}</span>
      <div>
        <p className="font-extrabold">{name}</p>
        <p className="num text-sm text-white/50">{en}</p>
      </div>
    </div>
  );
}

/* ---------------------------------- Pricing -------------------------------- */

export function Pricing({ plans }: { plans: Plan[] }) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-snow py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading id="pricing-title" eyebrow="الباقات" title="ادفع لما تشحنه فقط" description="ابدأ مجاناً بالباقة الأساسية، وانتقل لباقة أوفر عندما تنمو شحناتك." />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const featured = index === 1;
            return (
              <article key={plan.id} className={cn("relative flex flex-col rounded-2xl border p-7", featured ? "border-navy-900 bg-navy-900 text-white shadow-pop lg:-translate-y-3" : "border-line bg-white shadow-card")}>
                {featured && <span className="absolute -top-3 start-7 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-navy-900">الأكثر اختياراً</span>}
                <h3 className="text-xl font-extrabold">{plan.name}</h3>
                <p className={cn("mt-2 min-h-12 text-[15px]", featured ? "text-white/70" : "text-ink-muted")}>{plan.description}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="num text-5xl font-black">{plan.monthly_fee.amount === 0 ? "مجاناً" : plan.monthly_fee.value.toFixed(0)}</span>
                  {plan.monthly_fee.amount > 0 && <span className={featured ? "text-white/60" : "text-ink-subtle"}>ر.س / شهرياً</span>}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[15px]">
                      <BadgeCheck className={cn("mt-0.5 size-5 shrink-0", featured ? "text-green-400" : "text-green-600")} aria-hidden />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5 text-[15px]">
                    <Boxes className={cn("mt-0.5 size-5 shrink-0", featured ? "text-green-400" : "text-green-600")} aria-hidden />
                    رسوم الدفع عند الاستلام <span className="num font-bold">{plan.cod_fee.value.toFixed(2)}</span> ر.س
                  </li>
                </ul>
                <Button asChild className="mt-8 w-full" variant={featured ? "primary" : "navy"} size="lg">
                  <Link href="/register">ابدأ مع {plan.name}</Link>
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ FAQ ---------------------------------- */

export function Faq({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-white py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-8 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionHeading id="faq-title" eyebrow="الأسئلة الشائعة" title="لديك سؤال؟ لدينا الإجابة" align="start" />
          <p className="mt-4 text-ink-muted">لم تجد ما تبحث عنه؟ فريقنا جاهز لمساعدتك.</p>
          <Button asChild variant="outline" className="mt-6"><Link href="/contact">تواصل معنا</Link></Button>
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line">
          {faqs.map((faq) => (
            <details key={faq.question} className="group px-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-start text-[17px] font-bold text-ink">
                {faq.question}
                <ChevronDown className="size-5 shrink-0 text-ink-subtle transition-transform duration-300 group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-5 leading-8 text-ink-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- CTA ----------------------------------- */

export function CtaBand() {
  return (
    <section className="bg-white px-4 pb-20 md:px-8">
      <div className="grain relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-green-500 px-6 py-14 text-navy-900 md:px-14 md:py-16">
        <BrandPattern count={5} className="pointer-events-none absolute -bottom-4 -end-10 w-[620px] max-w-[90%] text-navy-900 opacity-25" />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-black leading-tight md:text-5xl">جاهز تشحن أسرع وتوفر أكثر؟</h2>
          <p className="mt-4 text-lg text-navy-900/75">سجّل الآن واحصل على أسعار الشحن المخفضة من أول شحنة.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="navy" size="lg"><Link href="/register">أنشئ حسابك مجاناً<ArrowLeft /></Link></Button>
            <Button asChild variant="outline" size="lg" className="border-navy-900/20 bg-transparent hover:bg-navy-900/5"><Link href="/contact">تحدث مع المبيعات</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Heading --------------------------------- */

export function SectionHeading({ id, eyebrow, title, description, align = "center" }: { id?: string; eyebrow: string; title: string; description?: string; align?: "center" | "start" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-sm font-bold text-primary-text">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-black leading-tight text-ink md:text-[44px]">{title}</h2>
      {description && <p className="mt-4 text-lg leading-8 text-ink-muted">{description}</p>}
    </div>
  );
}
