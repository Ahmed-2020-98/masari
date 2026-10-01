import type { Metadata } from "next";
import { DashboardGate } from "@/components/dashboard/gate";

export const metadata: Metadata = { title: { default: "لوحة التحكم", template: "%s | مساري" }, robots: { index: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardGate>{children}</DashboardGate>;
}
