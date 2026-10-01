import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { TrackForm } from "@/components/site/track-form";

export const metadata: Metadata = { title: "تتبع شحنة" };

export default function TrackPage() {
  return (
    <>
      <SiteHeader solid />
      <section className="bg-snow px-4 pb-24 pt-36">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-black text-ink md:text-5xl">تتبع شحنتك</h1>
          <p className="mt-3 text-lg text-ink-muted">أدخل رقم التتبع (البوليصة) أو رقم المرجع لمعرفة حالة شحنتك لحظة بلحظة.</p>
          <div className="mt-8 text-start">
            <TrackForm variant="light" />
          </div>
        </div>
      </section>
    </>
  );
}
