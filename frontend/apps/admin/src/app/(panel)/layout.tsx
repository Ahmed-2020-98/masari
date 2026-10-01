"use client";

import { Button, LogoMark } from "@masari/ui";
import { AdminShell } from "@/components/shell";
import { SessionProvider, useBootstrapQuery, useLogout } from "@/lib/session";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useBootstrapQuery();
  const logout = useLogout();

  if (isLoading) return <div className="grid min-h-dvh place-items-center"><LogoMark className="h-12 animate-pulse" /></div>;

  if (isError || !data || data.user.type.value !== "admin") {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold">لا تملك صلاحية الوصول إلى لوحة الإدارة</p>
          <Button className="mt-4" onClick={() => logout()}>تسجيل الدخول بحساب آخر</Button>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider value={data}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
