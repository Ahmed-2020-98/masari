import type { Plan } from "@masari/api";
import { publicFetch } from "@masari/api/server";
import { SiteFooter, type ContactInfo } from "@/components/site/site-footer";

export type SiteContent = {
  plans: Plan[];
  faqs: { question: string; answer: string }[];
  stats: { label: string; value: number; suffix?: string }[];
  contact: ContactInfo;
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const content = await publicFetch<SiteContent>("public/content");

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2">تخطي إلى المحتوى</a>
      <main id="main">{children}</main>
      <SiteFooter contact={content?.contact} />
    </>
  );
}
