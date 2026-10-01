import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "تواصل معنا" };

export default function ContactPage() {
  return (
    <>
      <SiteHeader solid />
      <section className="bg-snow px-4 pb-24 pt-36">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-sm font-bold text-primary-text">تواصل معنا</p>
            <h1 className="mt-3 text-4xl font-black text-ink">نسعد بخدمتك</h1>
            <p className="mt-4 text-lg leading-8 text-ink-muted">لأسئلة المبيعات والأسعار الخاصة بالأحجام الكبيرة، أو أي استفسار عن المنصة، أرسل لنا رسالتك وسيتواصل معك فريقنا خلال ساعات العمل.</p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
