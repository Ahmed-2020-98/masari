"use client";

import { Button, cn, Logo } from "@masari/ui";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "/#solutions", label: "حلول الشحن" },
  { href: "/#carriers", label: "شركات الشحن" },
  { href: "/#calculator", label: "حاسبة الأسعار" },
  { href: "/#pricing", label: "الباقات" },
  { href: "/track", label: "تتبع شحنة" },
  { href: "/#faq", label: "الأسئلة الشائعة" },
];

/** Transparent over the navy hero, turns solid once the page scrolls. */
export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  const dark = !scrolled && !open;

  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300", dark ? "bg-transparent" : "bg-white/90 shadow-[0_1px_0_var(--line)] backdrop-blur-lg")}>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" aria-label="مساري — الرئيسية" className="shrink-0">
          <Logo tone={dark ? "dark" : "light"} size="sm" />
        </Link>

        <nav aria-label="القائمة الرئيسية" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("rounded-md px-3 py-2 text-[15px] font-medium transition", dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-muted hover:bg-navy-50 hover:text-ink")}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" className={dark ? "text-white hover:bg-white/10" : ""}>
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild>
            <Link href="/register">ابدأ الآن مجاناً</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn("grid size-11 place-items-center rounded-md lg:hidden", dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-navy-50")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="القائمة" className="border-t border-line bg-white px-4 pb-6 pt-2 lg:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-navy-50">
              {link.label}
            </Link>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="outline"><Link href="/login">تسجيل الدخول</Link></Button>
            <Button asChild><Link href="/register">ابدأ الآن</Link></Button>
          </div>
        </nav>
      )}
    </header>
  );
}
