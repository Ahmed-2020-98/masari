import { Toaster } from "@masari/ui";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { inter, tajawal } from "@/lib/fonts";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "مساري — كل شحناتك في مكان واحد", template: "%s | مساري" },
  description: "منصة مساري لإدارة الشحن في السعودية: قارن أسعار أرامكس وسمسا وسبل وجي آند تي وغيرها، أنشئ البوالص، تتبع الشحنات، واستلم مبالغ الدفع عند الاستلام — بدون عقود.",
  openGraph: { type: "website", locale: "ar_SA", siteName: "مساري" },
};

export const viewport: Viewport = {
  themeColor: "#0F2741",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
