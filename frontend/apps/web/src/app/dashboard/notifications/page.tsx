"use client";

import { api, type AppNotification } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Button, Card, cn, EmptyState, PageHeader, Skeleton } from "@masari/ui";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type Page = { data: AppNotification[]; meta: { next_cursor: string | null; unread: number } };

export default function NotificationsPage() {
  const router = useRouter();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["notifications", "all"],
    queryFn: ({ pageParam }) => api<Page>("me/notifications", { query: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];

  const open = async (notification: AppNotification) => {
    if (!notification.read_at) await api(`me/notifications/${notification.id}/read`, { method: "POST" });
    client.invalidateQueries({ queryKey: ["bootstrap"] });
    if (notification.data.shipment_id) router.push(`/dashboard/shipments/${notification.data.shipment_id}`);
    else if (notification.data.ticket_id) router.push(`/dashboard/support/${notification.data.ticket_id}`);
    else if (notification.kind.startsWith("wallet") || notification.kind.startsWith("cod") || notification.kind.startsWith("payout")) router.push("/dashboard/wallet");
    else query.refetch();
  };

  return (
    <>
      <PageHeader title="الإشعارات" actions={<Button variant="outline" onClick={async () => { await api("me/notifications/read-all", { method: "POST" }); query.refetch(); client.invalidateQueries({ queryKey: ["bootstrap"] }); }}>تعليم الكل كمقروء</Button>} />
      <Card className="mx-auto max-w-3xl">
        {query.isLoading && <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div>}
        {!query.isLoading && !items.length && <EmptyState icon={<Bell />} title="لا توجد إشعارات" />}
        <ul className="divide-y divide-line">
          {items.map((notification) => (
            <li key={notification.id}>
              <button onClick={() => open(notification)} className={cn("flex w-full gap-3 px-5 py-4 text-start transition hover:bg-surface-muted", !notification.read_at && "bg-green-50/40")}>
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", notification.read_at ? "bg-transparent" : "bg-green-500")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{notification.title}</span>
                  <span className="block text-sm text-ink-muted">{notification.body}</span>
                  <span className="num mt-1 block text-xs text-ink-subtle">{formatDateTime(notification.created_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {query.hasNextPage && <div className="border-t border-line p-3 text-center"><Button variant="ghost" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>عرض المزيد</Button></div>}
      </Card>
    </>
  );
}
