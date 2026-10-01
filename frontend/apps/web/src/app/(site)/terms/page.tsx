import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = { title: "الشروط والأحكام" };

export default function Page() {
  return (
    <>
      <SiteHeader solid />
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-36">
        <h1 className="text-4xl font-black text-ink">الشروط والأحكام</h1>
        <p className="mt-6 leading-8 text-ink-muted">سيتم نشر النص القانوني المعتمد هنا بعد مراجعته من الفريق القانوني لمساري.</p>
      </article>
    </>
  );
}
