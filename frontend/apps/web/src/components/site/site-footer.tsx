import { BrandPattern, Logo } from "@masari/ui";
import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export type ContactInfo = { phone?: string; whatsapp?: string; email?: string; address?: string; cr_number?: string; vat_number?: string };

export function SiteFooter({ contact }: { contact?: ContactInfo }) {
  return (
    <footer className="grain relative overflow-hidden bg-navy-950 text-white">
      <BrandPattern className="pointer-events-none absolute bottom-16 end-0 w-[460px] max-w-[70%] text-white opacity-25" animated={false} />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-12 md:px-8">
        <div className="md:col-span-4">
          <Logo tone="dark" tagline />
          <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/65">
            مساري منصة سعودية متكاملة لإدارة الشحن، تجمع لك أهم شركات الشحن في مكان واحد لتشحن بسهولة وبأسعار أفضل.
          </p>
        </div>
        <FooterColumn title="المنصة" links={[["حلول الشحن", "/#solutions"], ["حاسبة الأسعار", "/#calculator"], ["الباقات", "/#pricing"], ["تتبع شحنة", "/track"]]} />
        <FooterColumn title="الشركة" links={[["تواصل معنا", "/contact"], ["الأسئلة الشائعة", "/#faq"], ["الشروط والأحكام", "/terms"], ["سياسة الخصوصية", "/privacy"]]} />
        <div className="md:col-span-4">
          <h3 className="text-sm font-bold text-green-400">تواصل معنا</h3>
          <ul className="mt-4 space-y-3 text-[15px] text-white/75">
            {contact?.phone && (
              <li className="flex items-center gap-3"><Phone className="size-4 text-green-400" aria-hidden /><a href={`tel:${contact.phone}`} className="num hover:text-white">{contact.phone}</a></li>
            )}
            {contact?.email && (
              <li className="flex items-center gap-3"><Mail className="size-4 text-green-400" aria-hidden /><a href={`mailto:${contact.email}`} className="num hover:text-white">{contact.email}</a></li>
            )}
            {contact?.address && (
              <li className="flex items-center gap-3"><MapPin className="size-4 text-green-400" aria-hidden />{contact.address}</li>
            )}
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-white/50 md:px-8">
          <span>© {new Date().getFullYear()} مساري. جميع الحقوق محفوظة.</span>
          <span className="num">
            {contact?.cr_number && <>س.ت {contact.cr_number}</>}
            {contact?.vat_number && <> · الرقم الضريبي {contact.vat_number}</>}
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2">
      <h3 className="text-sm font-bold text-green-400">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-[15px] text-white/70 transition hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
