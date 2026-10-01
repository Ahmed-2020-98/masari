"use client";

import { Button, LogoMark } from "@masari/ui";
import { useBootstrapQuery, SessionProvider } from "@/lib/session";
import { DashboardShell } from "./shell";

/** Loads the session once, then renders the shell. */
export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, refetch } = useBootstrapQuery();

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas" aria-busy>
        <LogoMark className="h-14 animate-pulse" title="جارٍ التحميل" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
        <div>
          <p className="text-lg font-bold">تعذر تحميل لوحة التحكم</p>
          <Button className="mt-4" onClick={() => refetch()}>إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider value={data}>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
