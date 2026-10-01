import type { Carrier, Region } from "@masari/api";
import { publicFetch } from "@masari/api/server";
import { Hero } from "@/components/site/hero";
import { RateCalculator } from "@/components/site/rate-calculator";
import { CarriersStrip, CtaBand, Faq, Features, HowItWorks, Integrations, Pricing, Stats } from "@/components/site/sections";
import { SiteHeader } from "@/components/site/site-header";
import type { SiteContent } from "./layout";

export default async function HomePage() {
  const [content, carriers, cities] = await Promise.all([
    publicFetch<SiteContent>("public/content"),
    publicFetch<{ data: Carrier[] }>("public/carriers"),
    publicFetch<{ data: Region[] }>("public/cities", 3600),
  ]);

  return (
    <>
      <SiteHeader />
      <Hero />
      {!!carriers?.data?.length && <CarriersStrip carriers={carriers.data} />}
      {!!content?.stats?.length && <Stats stats={content.stats} />}
      <HowItWorks />
      <Features />
      {!!cities?.data?.length && <RateCalculator regions={cities.data} />}
      <Integrations />
      {!!content?.plans?.length && <Pricing plans={content.plans} />}
      {!!content?.faqs?.length && <Faq faqs={content.faqs} />}
      <CtaBand />
    </>
  );
}
