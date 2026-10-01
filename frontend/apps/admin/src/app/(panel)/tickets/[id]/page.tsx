"use client";

import { api, fileUrl, type Ticket } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Button, Card, cn, EnumBadge, Field, NativeSelect, Skeleton, Textarea, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Paperclip, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session";

export default function AdminTicket() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-ticket", id], queryFn: () => api<{ data: Ticket }>(`admin/tickets/${id}`) });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin-ticket", id] });
  const reply = useMutation({ mutationFn: () => api(`admin/tickets/${id}/reply`, { method: "POST", body: { body } }), onSuccess: () => { setBody(""); refresh(); toast.success("تم إرسال الرد وإشعار التاجر"); } });
  const update = useMutation({ mutationFn: (patch: Record<string, unknown>) => api(`admin/tickets/${id}`, { method: "PATCH", body: patch }), onSuccess: refresh });
  const ticket = data?.data;
  if (isLoading || !ticket) return <Skeleton className="h-96" />;

  return (
    <>
      <Link href="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink"><ArrowRight className="size-4" />التذاكر</Link>
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h1 className="text-lg font-extrabold">{ticket.subject}</h1>
            <p className="text-sm text-ink-subtle"><span className="num">{ticket.number}</span> · {ticket.merchant?.store_name}{ticket.shipment && <> · <Link href={`/shipments/${ticket.shipment.id}`} className="num font-bold text-primary-text">{ticket.shipment.awb}</Link></>}</p>
          </div>
          <ol className="space-y-4 p-5">
            {ticket.messages?.map((message) => (
              <li key={message.id} className={cn("max-w-[85%] rounded-2xl px-4 py-3", message.is_staff ? "ms-auto rounded-se-sm bg-navy-900 text-white" : "rounded-ss-sm bg-surface-muted")}>
                <p className={cn("text-xs font-bold", message.is_staff ? "text-green-300" : "text-primary-text")}>{message.author}</p>
                <p className="mt-1 whitespace-pre-line leading-7">{message.body}</p>
                {message.attachments.map((file) => <a key={file.path} href={fileUrl(`admin/tickets/${ticket.id}/attachments/${file.path}`)} target="_blank" rel="noopener" className="mt-1 flex items-center gap-1 text-sm underline"><Paperclip className="size-3.5" />{file.name}</a>)}
                <p className={cn("num mt-1 text-[11px]", message.is_staff ? "text-white/50" : "text-ink-subtle")}>{formatDateTime(message.created_at)}</p>
              </li>
            ))}
          </ol>
          <form className="border-t border-line p-4" onSubmit={(event) => { event.preventDefault(); reply.mutate(); }}>
            <label htmlFor="reply" className="sr-only">الرد</label>
            <Textarea id="reply" rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="اكتب الرد للتاجر…" />
            <div className="mt-3 flex justify-end"><Button type="submit" loading={reply.isPending} disabled={!body.trim()}><Send />إرسال الرد</Button></div>
          </form>
        </Card>
        <Card className="h-fit space-y-4 p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-ink-subtle">الحالة</span><EnumBadge value={ticket.status} /></div>
          <Field label="تغيير الحالة" htmlFor="t-status"><NativeSelect id="t-status" value={ticket.status.value} onChange={(event) => update.mutate({ status: event.target.value })}><option value="open">مفتوحة</option><option value="pending">بانتظار التاجر</option><option value="answered">تم الرد</option><option value="closed">مغلقة</option></NativeSelect></Field>
          <Field label="الأولوية" htmlFor="t-priority"><NativeSelect id="t-priority" value={ticket.priority} onChange={(event) => update.mutate({ priority: event.target.value })}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></NativeSelect></Field>
          <Button variant="outline" className="w-full" onClick={() => update.mutate({ assigned_to: session.user.id })}>إسنادها لي</Button>
          {ticket.assignee && <p className="text-sm text-ink-subtle">المسؤول: <span className="font-bold text-ink">{ticket.assignee.name}</span></p>}
        </Card>
      </div>
    </>
  );
}
