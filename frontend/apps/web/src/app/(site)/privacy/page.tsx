import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default function Page() {
  return (
    <>
      <SiteHeader solid />
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-36">
        <h1 className="text-4xl font-black text-ink">سياسة الخصوصية</h1>
        <p className="mt-6 leading-8 text-ink-muted">سيتم نشر النص القانوني المعتمد هنا بعد مراجعته من الفريق القانوني لمساري.</p>
      </article>
    </>
  );
}
