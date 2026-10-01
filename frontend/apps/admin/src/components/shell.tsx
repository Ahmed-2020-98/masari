"use client";

import { api } from "@masari/api";
import { Button, cn, Dialog, LogoMark, SheetContent } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Banknote, Building2, CreditCard, FileEdit, Headset, LayoutDashboard, Layers, LogOut, MapPin, Menu, ShieldCheck, Store, Truck, Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLogout, usePermission, useSession } from "@/lib/session";

type Item = { href: string; label: string; icon: typeof Truck; permission?: string; badge?: "topups" | "payouts" | "tickets" };

const groups: { title?: string; items: Item[] }[] = [
  { items: [{ href: "/", label: "نظرة عامة", icon: LayoutDashboard }] },
  {
    title: "العمليات",
    items: [
      { href: "/merchants", label: "التجار", icon: Store, permission: "merchants.manage" },
      { href: "/shipments", label: "الشحنات", icon: Truck, permission: "shipments.manage" },
      { href: "/tickets", label: "تذاكر الدعم", icon: Headset, permission: "support.manage", badge: "tickets" },
    ],
  },
  {
    title: "المالية",
    items: [
      { href: "/finance/topups", label: "طلبات الشحن", icon: CreditCard, permission: "finance.manage", badge: "topups" },
      { href: "/finance/cod", label: "تسويات التحصيل", icon: Banknote, permission: "finance.manage" },
      { href: "/finance/payouts", label: "التحويلات البنكية", icon: Wallet, permission: "finance.manage", badge: "payouts" },
    ],
  },
  {
    title: "الإعدادات",
    items: [
      { href: "/carriers", label: "شركات الشحن والأسعار", icon: Building2, permission: "carriers.manage" },
      { href: "/plans", label: "الباقات", icon: Layers, permission: "carriers.manage" },
      { href: "/cities", label: "المدن والمناطق", icon: MapPin, permission: "carriers.manage" },
      { href: "/content", label: "محتوى الموقع", icon: FileEdit, permission: "content.manage" },
      { href: "/admins", label: "المشرفون", icon: ShieldCheck, permission: "admins.manage" },
      { href: "/activity", label: "سجل النشاط", icon: Activity, permission: "admins.manage" },
    ],
  },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const can = usePermission();
  const queues = useQuery({ queryKey: ["admin-dashboard", 30], queryFn: () => api<{ queues: Record<string, number> }>("admin/dashboard"), staleTime: 60_000 });

  return (
    <nav aria-label="قائمة الإدارة" className="space-y-6">
      {groups.map((group, index) => {
        const items = group.items.filter((item) => can(item.permission));
        if (!items.length) return null;
        return (
          <div key={index}>
            {group.title && <p className="mb-2 px-3 text-[11px] font-bold text-white/40">{group.title}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const count = item.badge ? queues.data?.queues[item.badge] ?? 0 : 0;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-md px-3 text-[14.5px] font-medium transition", active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white")}>
                      <item.icon className={cn("size-[18px]", active ? "text-green-400" : "text-white/45")} aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && <span className="num rounded-full bg-green-500 px-2 py-0.5 text-[11px] font-bold text-navy-900">{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[260px] flex-col bg-navy-950 lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <LogoMark className="h-8" />
          <div className="leading-tight"><p className="font-extrabold text-white">مساري</p><p className="text-[11px] text-green-400">لوحة الإدارة</p></div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin"><Nav /></div>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-bold text-white">{session.user.name}</p>
          <p className="text-xs text-white/50">{session.user.roles?.join("، ")}</p>
          <button onClick={() => logout()} className="mt-3 flex items-center gap-2 text-sm text-white/60 hover:text-white"><LogOut className="size-4" />تسجيل الخروج</button>
        </div>
      </aside>
      <div className="lg:ps-[260px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="icon-sm" variant="ghost" onClick={() => setOpen(true)} aria-label="القائمة"><Menu /></Button>
            <SheetContent title="القائمة" side="start" className="max-w-[280px] bg-navy-950 [&_h2]:text-white"><div className="p-4"><Nav onNavigate={() => setOpen(false)} /></div></SheetContent>
          </Dialog>
          <LogoMark className="h-7" />
          <span className="font-extrabold">إدارة مساري</span>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
