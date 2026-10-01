"use client";

import { api, ApiError, type Address, type Carrier, type StoreConnection, type WebhookEndpoint } from "@masari/api";
import { formatDateTime, formatRelative } from "@masari/i18n";
import {
  Badge, Button, Card, CardHeader, Checkbox, Dialog, DialogContent, DialogFooter, EmptyState, Field, Input, NativeSelect, PageHeader, Switch, Tabs, TabsContent, TabsList, TabsTrigger, toast,
} from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Copy, KeyRound, Link2, Plus, Store, Trash2, Webhook } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

const PLATFORMS = [
  { value: "salla", name: "سلة", en: "Salla", color: "#004956", bg: "#BAF3E6", body: "استيراد الطلبات تلقائياً وتحديث حالة الطلب ورقم التتبع في متجرك." },
  { value: "zid", name: "زد", en: "Zid", color: "#5B2E91", bg: "#E9DDFB", body: "اربط متجرك في زد لاستقبال الطلبات وإنشاء البوالص بضغطة زر." },
] as const;

function CopyValue({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-surface-muted p-2">
      <code className="num min-w-0 flex-1 truncate text-sm" dir="ltr">{value}</code>
      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(value); toast.success("تم النسخ"); }}><Copy />نسخ</Button>
    </div>
  );
}

function StoresTab() {
  const client = useQueryClient();
  const connections = useQuery({ queryKey: ["integrations"], queryFn: () => api<{ data: StoreConnection[] }>("merchant/integrations") });
  const carriers = useQuery({ queryKey: ["carriers"], queryFn: () => api<{ data: Carrier[] }>("merchant/carriers") });
  const senders = useQuery({ queryKey: ["addresses", "sender"], queryFn: () => api<{ data: Address[] }>("merchant/addresses", { query: { type: "sender" } }) });
  const [disconnecting, setDisconnecting] = useState<StoreConnection | null>(null);

  const connect = useMutation({
    mutationFn: (platform: string) => api<{ url: string }>("merchant/integrations/connect", { method: "POST", body: { platform } }),
    onSuccess: (result) => { window.location.href = result.url; },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, settings }: { id: number; settings: Partial<StoreConnection["settings"]> }) => api(`merchant/integrations/${id}`, { method: "PATCH", body: settings }),
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); client.invalidateQueries({ queryKey: ["integrations"] }); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const disconnect = useMutation({
    mutationFn: (id: number) => api(`merchant/integrations/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("تم إلغاء الربط"); client.invalidateQueries({ queryKey: ["integrations"] }); setDisconnecting(null); },
  });

  const active = connections.data?.data.filter((connection) => connection.status === "active") ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <Card key={platform.value} className="flex items-start gap-4 p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl text-xl font-black" style={{ backgroundColor: platform.bg, color: platform.color }}>{platform.name}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{platform.name} <span className="num text-sm font-normal text-ink-subtle">{platform.en}</span></p>
              <p className="mt-1 text-sm text-ink-muted">{platform.body}</p>
              <Button size="sm" className="mt-3" onClick={() => connect.mutate(platform.value)} loading={connect.isPending && connect.variables === platform.value}><Link2 />ربط المتجر</Button>
            </div>
          </Card>
        ))}
      </div>

      {active.map((connection) => (
        <Card key={connection.id}>
          <CardHeader
            title={<span className="flex items-center gap-2">{connection.store_name ?? connection.store_id}<Badge tone="green" dot>متصل</Badge></span>}
            description={<>{connection.platform.label} · آخر مزامنة {formatRelative(connection.last_synced_at)} · <span className="num">{connection.orders_count ?? 0}</span> طلب</>}
            action={<Button size="sm" variant="danger-soft" onClick={() => setDisconnecting(connection)}>إلغاء الربط</Button>}
          />
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 md:col-span-3">
              <span><span className="block font-bold">الشحن التلقائي</span><span className="text-sm text-ink-subtle">إنشاء البوليصة فور وصول الطلب باستخدام الشركة والمستودع الافتراضيين.</span></span>
              <Switch checked={connection.settings.auto_ship} onCheckedChange={(checked) => update.mutate({ id: connection.id, settings: { auto_ship: checked } })} aria-label="الشحن التلقائي" />
            </label>
            <Field label="خدمة الشحن الافتراضية" htmlFor={`svc-${connection.id}`}>
              <NativeSelect id={`svc-${connection.id}`} value={connection.settings.carrier_service_id ?? ""} onChange={(event) => update.mutate({ id: connection.id, settings: { carrier_service_id: Number(event.target.value) || null } })}>
                <option value="">اختر</option>
                {carriers.data?.data.flatMap((carrier) => carrier.services?.map((service) => <option key={service.id} value={service.id}>{carrier.name} — {service.name}</option>) ?? [])}
              </NativeSelect>
            </Field>
            <Field label="مستودع الاستلام" htmlFor={`snd-${connection.id}`}>
              <NativeSelect id={`snd-${connection.id}`} value={connection.settings.sender_address_id ?? ""} onChange={(event) => update.mutate({ id: connection.id, settings: { sender_address_id: Number(event.target.value) || null } })}>
                <option value="">اختر</option>
                {senders.data?.data.map((address) => <option key={address.id} value={address.id}>{address.label ?? address.name}</option>)}
              </NativeSelect>
            </Field>
          </div>
        </Card>
      ))}

      <ConfirmDialog open={!!disconnecting} onOpenChange={(open) => !open && setDisconnecting(null)} title="إلغاء ربط المتجر؟" description="لن تصلك طلبات جديدة من هذا المتجر." confirmLabel="إلغاء الربط" loading={disconnect.isPending} onConfirm={() => disconnecting && disconnect.mutate(disconnecting.id)} />
    </div>
  );
}

function ApiTab() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const tokens = useQuery({ queryKey: ["api-tokens"], queryFn: () => api<{ data: { id: number; name: string; last_used_at: string | null; created_at: string }[] }>("merchant/api-tokens") });
  const create = useMutation({
    mutationFn: () => api<{ token: string }>("merchant/api-tokens", { method: "POST", body: { name } }),
    onSuccess: (result) => { setCreated(result.token); setName(""); client.invalidateQueries({ queryKey: ["api-tokens"] }); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api(`merchant/api-tokens/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("تم حذف المفتاح"); client.invalidateQueries({ queryKey: ["api-tokens"] }); },
  });
  const apiBase = `${process.env.NEXT_PUBLIC_API_PUBLIC_URL ?? "https://api.masari.sa"}/api/v1`;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader title="مفاتيح API" description="استخدم المفتاح في ترويسة Authorization: Bearer للاتصال بواجهة مساري." />
        <div className="p-5">
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
            <label htmlFor="token-name" className="sr-only">اسم المفتاح</label>
            <Input id="token-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم المفتاح، مثال: متجر ووكومرس" />
            <Button type="submit" loading={create.isPending} disabled={!name.trim()}><Plus />إنشاء</Button>
          </form>
          {created && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-bold text-amber-900">انسخ المفتاح الآن — لن يظهر مرة أخرى.</p>
              <CopyValue value={created} />
            </div>
          )}
          <ul className="mt-5 divide-y divide-line">
            {tokens.data?.data.map((token) => (
              <li key={token.id} className="flex items-center gap-3 py-3">
                <KeyRound className="size-5 text-ink-subtle" aria-hidden />
                <div className="flex-1"><p className="font-bold">{token.name}</p><p className="text-xs text-ink-subtle">آخر استخدام: {token.last_used_at ? formatRelative(token.last_used_at) : "لم يُستخدم"}</p></div>
                <Button size="icon-sm" variant="ghost" onClick={() => revoke.mutate(token.id)} aria-label="حذف المفتاح"><Trash2 /></Button>
              </li>
            ))}
            {tokens.data?.data.length === 0 && <li className="py-6 text-center text-sm text-ink-subtle">لا توجد مفاتيح بعد.</li>}
          </ul>
        </div>
      </Card>
      <Card className="bg-navy-900 p-5 text-white">
        <p className="flex items-center gap-2 font-bold"><Code2 className="size-5 text-green-400" />مثال سريع</p>
        <pre dir="ltr" className="num mt-4 overflow-x-auto rounded-lg bg-navy-950 p-4 text-xs leading-6 text-white/80 scrollbar-thin">{`curl -X POST ${apiBase}/merchant/shipments \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Accept: application/json" \\
  -d '{"carrier_service_id":1,
       "sender_address_id":1,
       "recipient":{"name":"...",
         "phone":"0551234567","city_id":11},
       "weight_kg":1,"cod_amount":150}'`}</pre>
        <p className="mt-3 text-sm text-white/60">التوثيق الكامل متاح عبر OpenAPI على المسار <code className="num">/docs/api</code>.</p>
      </Card>
    </div>
  );
}

function WebhooksTab() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["shipment.status_changed"]);
  const [secret, setSecret] = useState<string | null>(null);
  const endpoints = useQuery({ queryKey: ["webhooks"], queryFn: () => api<{ data: WebhookEndpoint[]; events: string[] }>("merchant/webhooks") });
  const create = useMutation({
    mutationFn: () => api<{ data: WebhookEndpoint }>("merchant/webhooks", { method: "POST", body: { url, events, is_active: true } }),
    onSuccess: (result) => { setSecret(result.data.secret ?? null); setOpen(false); setUrl(""); client.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`merchant/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["webhooks"] }),
  });
  const toggle = useMutation({
    mutationFn: (endpoint: WebhookEndpoint) => api(`merchant/webhooks/${endpoint.id}`, { method: "PUT", body: { url: endpoint.url, events: endpoint.events, is_active: !endpoint.is_active } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return (
    <Card>
      <CardHeader title="Webhooks" description="نرسل طلب POST موقّعاً (X-Masari-Signature) إلى رابطك عند كل حدث." action={<Button size="sm" onClick={() => setOpen(true)}><Plus />إضافة رابط</Button>} />
      <div className="p-5">
        {secret && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-bold text-amber-900">مفتاح التوقيع (يظهر مرة واحدة):</p>
            <CopyValue value={secret} />
          </div>
        )}
        {endpoints.data?.data.length === 0 && <EmptyState icon={<Webhook />} title="لا توجد روابط" className="py-8" />}
        <ul className="divide-y divide-line">
          {endpoints.data?.data.map((endpoint) => (
            <li key={endpoint.id} className="flex flex-wrap items-center gap-3 py-3">
              <Switch checked={endpoint.is_active} onCheckedChange={() => toggle.mutate(endpoint)} aria-label="تفعيل" />
              <div className="min-w-0 flex-1">
                <p className="num truncate text-sm font-bold" dir="ltr" style={{ textAlign: "right" }}>{endpoint.url}</p>
                <p className="mt-1 flex flex-wrap gap-1">{endpoint.events.map((event) => <Badge key={event} tone="gray" className="num">{event}</Badge>)}</p>
              </div>
              <p className="text-xs text-ink-subtle">{endpoint.last_success_at ? `آخر نجاح ${formatDateTime(endpoint.last_success_at)}` : "لم يُرسل بعد"}</p>
              <Button size="icon-sm" variant="ghost" onClick={() => remove.mutate(endpoint.id)} aria-label="حذف"><Trash2 /></Button>
            </li>
          ))}
        </ul>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="إضافة رابط Webhook">
          <Field label="الرابط (HTTPS)" htmlFor="wh-url" required><Input id="wh-url" type="url" dir="ltr" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/masari/webhook" /></Field>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">الأحداث</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {endpoints.data?.events.map((event) => (
                <label key={event} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <Checkbox checked={events.includes(event)} onCheckedChange={(checked) => setEvents(checked ? [...events, event] : events.filter((item) => item !== event))} />
                  <span className="num">{event}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!url || !events.length}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function IntegrationsPage() {
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("connected")) toast.success("تم ربط المتجر بنجاح");
    if (params.get("error")) toast.error("تعذر ربط المتجر، حاول مرة أخرى.");
  }, [params]);

  return (
    <>
      <PageHeader title="الربط والتكامل" description="اربط متجرك الإلكتروني أو أنظمتك مع مساري." />
      <Tabs defaultValue="stores">
        <TabsList className="mb-4">
          <TabsTrigger value="stores"><Store className="size-4" />المتاجر</TabsTrigger>
          <TabsTrigger value="api"><KeyRound className="size-4" />واجهة API</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="size-4" />Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="stores"><StoresTab /></TabsContent>
        <TabsContent value="api"><ApiTab /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
      </Tabs>
    </>
  );
}

export default function Page() {
  return <Suspense><IntegrationsPage /></Suspense>;
}
