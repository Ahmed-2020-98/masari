"use client";

import { api, type AppNotification } from "@masari/api";
import { formatRelative } from "@masari/i18n";
import {
  Button, cn, Dialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Logo, Money, SheetContent,
} from "@masari/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, Settings, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCan, useLogout, useSession } from "@/lib/session";
import { mobileNav, navGroups, type NavItem } from "./nav";

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  if (item.href === "/dashboard/shipments") return pathname === item.href || /^\/dashboard\/shipments\/(?!new|bulk)/.test(pathname);
  return pathname.startsWith(item.href);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const can = useCan();

  return (
    <nav aria-label="قائمة لوحة التحكم" className="space-y-6">
      {navGroups.map((group, index) => {
        const items = group.items.filter((item) => !item.ability || can(item.ability));
        if (!items.length) return null;
        return (
          <div key={index}>
            {group.title && <p className="mb-2 px-3 text-[11px] font-bold tracking-wide text-ink-subtle">{group.title}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 rounded-md px-3 text-[14.5px] font-medium transition",
                        active ? "bg-navy-900 text-white shadow-card" : "text-ink-muted hover:bg-navy-50 hover:text-ink dark:hover:bg-navy-800",
                      )}
                    >
                      {active && <span aria-hidden className="absolute -start-3 top-2 h-6 w-1 rounded-e-full bg-green-500" />}
                      <item.icon className={cn("size-[18px] shrink-0", active ? "text-green-400" : "text-ink-subtle group-hover:text-ink")} aria-hidden />
                      {item.label}
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

function NotificationsMenu({ unread }: { unread: number }) {
  const client = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["notifications", "menu"],
    queryFn: () => api<{ data: AppNotification[]; meta: { unread: number } }>("me/notifications"),
    enabled: false,
  });

  return (
    <DropdownMenu onOpenChange={(open) => open && refetch()}>
      <DropdownMenuTrigger asChild>
        <button className="relative grid size-10 place-items-center rounded-md text-ink-muted transition hover:bg-navy-50 hover:text-ink" aria-label={`الإشعارات${unread ? ` (${unread} غير مقروءة)` : ""}`}>
          <Bell className="size-5" />
          {unread > 0 && <span className="num absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-bold">الإشعارات</p>
          <button
            className="text-xs font-bold text-primary-text hover:underline"
            onClick={async () => {
              await api("me/notifications/read-all", { method: "POST" });
              client.invalidateQueries({ queryKey: ["bootstrap"] });
              refetch();
            }}
          >
            تعليم الكل كمقروء
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {!data?.data.length && <p className="px-4 py-10 text-center text-sm text-ink-subtle">لا توجد إشعارات جديدة</p>}
          {data?.data.slice(0, 8).map((notification) => (
            <div key={notification.id} className={cn("flex gap-3 border-b border-line px-4 py-3 last:border-0", !notification.read_at && "bg-green-50/50")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", notification.read_at ? "bg-line-strong" : "bg-green-500")} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{notification.title}</p>
                <p className="truncate text-sm text-ink-muted">{notification.body}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">{formatRelative(notification.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/notifications" className="block border-t border-line px-4 py-2.5 text-center text-sm font-bold text-primary-text hover:bg-surface-muted">عرض كل الإشعارات</Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      className="relative hidden w-full max-w-sm md:block"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) router.push(`/dashboard/shipments?search=${encodeURIComponent(value.trim())}`);
      }}
    >
      <label htmlFor="quick-search" className="sr-only">بحث عن شحنة</label>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
      <input
        id="quick-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ابحث برقم التتبع، الجوال أو رقم الطلب"
        className="h-10 w-full rounded-md border border-transparent bg-surface-muted ps-9 pe-3 text-sm outline-none transition focus:border-green-500 focus:bg-surface focus:ring-4 focus:ring-green-500/15"
      />
    </form>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const can = useCan();
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useLogout();
  const router = useRouter();
  const client = useQueryClient();

  const switchMerchant = async (merchantId: number) => {
    await api("me/switch-merchant", { method: "POST", body: { merchant_id: merchantId } });
    client.clear();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[264px] flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-18 items-center px-6">
          <Link href="/dashboard" aria-label="لوحة التحكم"><Logo size="sm" /></Link>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 scrollbar-thin">
          <SidebarNav />
        </div>
        {session.merchant?.plan && (
          <div className="m-4 rounded-lg bg-navy-900 p-4 text-white">
            <p className="text-xs text-white/60">باقتك الحالية</p>
            <p className="mt-0.5 font-bold">{session.merchant.plan.name}</p>
            <Link href="/#pricing" className="mt-2 inline-block text-xs font-bold text-green-400 hover:underline">ترقية الباقة</Link>
          </div>
        )}
      </aside>

      <div className="lg:ps-[264px]">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-lg">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <button onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-md hover:bg-navy-50 lg:hidden" aria-label="فتح القائمة">
                <Menu className="size-5" />
              </button>
              <SheetContent title={<Logo size="sm" />} side="start" className="max-w-[300px]">
                <div className="p-4"><SidebarNav onNavigate={() => setMenuOpen(false)} /></div>
              </SheetContent>
            </Dialog>
            <Link href="/dashboard" className="lg:hidden" aria-label="الرئيسية"><Logo size="sm" className="[&>span:last-child]:hidden sm:[&>span:last-child]:flex" /></Link>

            <QuickSearch />

            <div className="ms-auto flex items-center gap-1.5">
              {can("wallet") && session.wallet && (
                <Link href="/dashboard/wallet" className="hidden items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 transition hover:border-green-500 sm:flex">
                  <span className="text-xs text-ink-subtle">الرصيد</span>
                  <Money value={session.wallet} className={cn("text-sm font-bold", session.wallet.amount < 0 && "text-rose-600")} />
                </Link>
              )}
              {can("shipments") && (
                <Button asChild size="sm" className="hidden md:inline-flex">
                  <Link href="/dashboard/shipments/new"><Plus />شحنة جديدة</Link>
                </Button>
              )}
              <NotificationsMenu unread={session.unread_notifications} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-navy-50" aria-label="قائمة الحساب">
                    <span className="grid size-8 place-items-center rounded-full bg-green-500 text-sm font-extrabold text-navy-900">{session.user.name.charAt(0)}</span>
                    <span className="hidden text-start leading-tight md:block">
                      <span className="block max-w-36 truncate text-sm font-bold">{session.user.name}</span>
                      <span className="block max-w-36 truncate text-xs text-ink-subtle">{session.merchant?.store_name}</span>
                    </span>
                    <ChevronDown className="hidden size-4 text-ink-subtle md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60">
                  <DropdownMenuLabel>{session.role?.label}</DropdownMenuLabel>
                  <DropdownMenuItem asChild><Link href="/dashboard/settings"><UserRound />الملف الشخصي والمتجر</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/dashboard/settings?tab=security"><Settings />الأمان والأجهزة</Link></DropdownMenuItem>
                  {session.merchants.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>التبديل إلى متجر</DropdownMenuLabel>
                      {session.merchants.filter((merchant) => merchant.id !== session.merchant?.id).map((merchant) => (
                        <DropdownMenuItem key={merchant.id} onSelect={() => switchMerchant(merchant.id)}><Store />{merchant.store_name}</DropdownMenuItem>
                      ))}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem tone="danger" onSelect={() => logout()}><LogOut />تسجيل الخروج</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 md:px-6 lg:pb-10">{children}</main>
      </div>

      <nav aria-label="التنقل السريع" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {mobileNav.filter((item) => !item.ability || can(item.ability)).map((item) => {
            const active = isActive(pathname, item);
            const primary = item.href.endsWith("/new");
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium">
                  {primary ? (
                    <span className="-mt-7 grid size-13 place-items-center rounded-2xl bg-green-500 text-navy-900 shadow-glow"><item.icon className="size-6" aria-hidden /></span>
                  ) : (
                    <item.icon className={cn("size-5", active ? "text-green-600" : "text-ink-subtle")} aria-hidden />
                  )}
                  <span className={active ? "font-bold text-ink" : "text-ink-subtle"}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={() => setMenuOpen(true)} className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-subtle">
              <Menu className="size-5" aria-hidden />
              المزيد
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
