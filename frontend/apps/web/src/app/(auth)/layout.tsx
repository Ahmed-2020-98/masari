import { BrandPattern, Logo } from "@masari/ui";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,44%)]">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="self-start" aria-label="العودة للرئيسية">
          <Logo size="sm" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px] animate-rise">{children}</div>
        </div>
        <p className="text-center text-xs text-ink-subtle">© {new Date().getFullYear()} مساري · <Link href="/terms" className="hover:text-ink">الشروط</Link> · <Link href="/privacy" className="hover:text-ink">الخصوصية</Link></p>
      </main>

      <aside className="grain relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-32 -start-32 size-[480px] rounded-full bg-green-500/15 blur-3xl" />
        <p className="relative text-sm font-bold text-green-400">كل شحناتك في مكان واحد</p>
        <div className="relative">
          <h2 className="text-4xl font-black leading-tight xl:text-5xl">اشحن مع 8 شركات<br />من لوحة واحدة<span className="text-green-400">.</span></h2>
          <ul className="mt-8 space-y-4 text-lg text-white/80">
            {["بدون عقود أو اشتراك إلزامي", "أسعار مخفضة من أول شحنة", "تحصيل الدفع عند الاستلام إلى محفظتك"].map((item) => (
              <li key={item} className="flex items-center gap-3"><BadgeCheck className="size-6 text-green-400" aria-hidden />{item}</li>
            ))}
          </ul>
        </div>
        <BrandPattern count={5} className="relative w-full text-white" />
      </aside>
    </div>
  );
}
