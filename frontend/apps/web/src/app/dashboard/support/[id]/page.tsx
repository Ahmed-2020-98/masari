"use client";

import { api, ApiError, fileUrl, type Ticket } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import { Button, Card, cn, EnumBadge, LogoMark, Skeleton, Textarea, toast } from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Paperclip, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["ticket", id], queryFn: () => api<{ data: Ticket }>(`merchant/tickets/${id}`), refetchInterval: 20_000 });
  const ticket = data?.data;

  const reply = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append("body", body);
      Array.from(files ?? []).forEach((file) => form.append("attachments[]", file));
      return api(`merchant/tickets/${id}/reply`, { method: "POST", body: form });
    },
    onSuccess: () => { setBody(""); setFiles(null); client.invalidateQueries({ queryKey: ["ticket", id] }); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const close = useMutation({ mutationFn: () => api(`merchant/tickets/${id}/close`, { method: "POST" }), onSuccess: () => client.invalidateQueries({ queryKey: ["ticket", id] }) });

  if (isLoading || !ticket) return <Skeleton className="h-96" />;

  return (
    <>
      <Link href="/dashboard/support" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-subtle hover:text-ink"><ArrowRight className="size-4" />الدعم الفني</Link>
      <Card className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h1 className="text-lg font-extrabold">{ticket.subject}</h1>
            <p className="text-sm text-ink-subtle"><span className="num">{ticket.number}</span> · {ticket.category.label}{ticket.shipment && <> · <Link href={`/dashboard/shipments/${ticket.shipment.id}`} className="num font-bold text-primary-text">{ticket.shipment.awb}</Link></>}</p>
          </div>
          <div className="flex items-center gap-2">
            <EnumBadge value={ticket.status} />
            {ticket.status.value !== "closed" && <Button size="sm" variant="outline" onClick={() => close.mutate()}>إغلاق التذكرة</Button>}
          </div>
        </div>
        <ol className="space-y-5 p-5">
          {ticket.messages?.map((message) => (
            <li key={message.id} className={cn("flex gap-3", message.is_staff ? "" : "flex-row-reverse")}>
              {message.is_staff ? <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900"><LogoMark className="h-4" title="" /></span> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green-500 font-bold text-navy-900">{message.author?.charAt(0)}</span>}
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-3", message.is_staff ? "rounded-ss-sm bg-surface-muted" : "rounded-se-sm bg-navy-900 text-white")}>
                <p className={cn("text-xs font-bold", message.is_staff ? "text-primary-text" : "text-green-300")}>{message.is_staff ? "فريق مساري" : message.author}</p>
                <p className="mt-1 whitespace-pre-line leading-7">{message.body}</p>
                {message.attachments.map((file) => (
                  <a key={file.path} href={fileUrl(`merchant/tickets/${ticket.id}/attachments/${file.path}`)} className={cn("mt-2 flex items-center gap-1.5 text-sm underline", message.is_staff ? "text-primary-text" : "text-green-200")} target="_blank" rel="noopener"><Paperclip className="size-3.5" />{file.name}</a>
                ))}
                <p className={cn("num mt-1.5 text-[11px]", message.is_staff ? "text-ink-subtle" : "text-white/50")}>{formatDateTime(message.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>
        {ticket.status.value !== "closed" && (
          <form className="border-t border-line p-4" onSubmit={(event) => { event.preventDefault(); reply.mutate(); }}>
            <label htmlFor="reply" className="sr-only">ردك</label>
            <Textarea id="reply" rows={3} value={body} onChange={(event) => setBody(event.target.value)} placeholder="اكتب ردك هنا…" />
            <div className="mt-3 flex items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-subtle hover:text-ink"><Paperclip className="size-4" />{files?.length ? `${files.length} مرفقات` : "إرفاق ملف"}<input type="file" multiple className="sr-only" accept="image/*,application/pdf" onChange={(event) => setFiles(event.target.files)} /></label>
              <Button type="submit" loading={reply.isPending} disabled={!body.trim()}><Send />إرسال</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
