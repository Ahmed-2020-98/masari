"use client";

import { api, ApiError, type Enum, type Money as MoneyValue, type Payout, type Shipment } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import {
  Button, Card, DataTable, Dialog, DialogContent, DialogFooter, EmptyState, EnumBadge, Field, Input, KpiCard, Money, PageHeader, Pagination, Segmented, Tabs, TabsContent, TabsList, TabsTrigger, toast,
} from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Clock, Landmark, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CarrierCell } from "@/components/dashboard/shipment-bits";
import { useRefreshSession, useSession } from "@/lib/session";
import { usePaginated } from "@/lib/use-paginated";

type Summary = { pending: MoneyValue; collected: MoneyValue; credited: MoneyValue; paid_out: MoneyValue; statuses: Enum[] };

export default function CodPage() {
  const router = useRouter();
  const session = useSession();
  const client = useQueryClient();
  const refreshSession = useRefreshSession();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const summary = useQuery({ queryKey: ["cod-summary"], queryFn: () => api<Summary>("merchant/cod/summary") });
  const shipments = usePaginated<Shipment>("merchant/cod", { cod_status: status, page });
  const payouts = usePaginated<Payout>("merchant/payouts", {});

  const request = useMutation({
    mutationFn: () => api("merchant/payouts", { method: "POST", body: { amount: Number(amount) } }),
    onSuccess: () => {
      toast.success("تم إرسال طلب التحويل، سيتم تنفيذه خلال يوم عمل.");
      client.invalidateQueries({ queryKey: ["merchant/payouts"] });
      refreshSession();
      setOpen(false);
    },
    onError: (error: ApiError) => toast.error(error.message),
  });

  const merchant = session.merchant;

  return (
    <>
      <PageHeader title="الدفع عند الاستلام" description="تتبع مبالغ التحصيل من لحظة التوصيل حتى وصولها إلى حسابك البنكي." actions={<Button onClick={() => { setAmount(String(Math.max(0, session.wallet?.value ?? 0))); setOpen(true); }}><Send />طلب تحويل بنكي</Button>} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard label="بانتظار التحصيل" value={<Money value={summary.data?.pending} />} icon={<Clock />} tone="amber" loading={summary.isLoading} hint="شحنات لم تُسلَّم بعد" />
        <KpiCard label="محصّل لدى الشركات" value={<Money value={summary.data?.collected} />} icon={<Banknote />} tone="blue" loading={summary.isLoading} hint="بانتظار التوريد" />
        <KpiCard label="أضيف إلى المحفظة" value={<Money value={summary.data?.credited} />} icon={<CheckCircle2 />} tone="green" loading={summary.isLoading} />
        <KpiCard label="تم تحويله للبنك" value={<Money value={summary.data?.paid_out} />} icon={<Landmark />} tone="navy" loading={summary.isLoading} />
      </div>

      <Tabs defaultValue="shipments" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="shipments">شحنات التحصيل</TabsTrigger>
          <TabsTrigger value="payouts">طلبات التحويل</TabsTrigger>
        </TabsList>
        <TabsContent value="shipments">
          <Card>
            <div className="border-b border-line p-4">
              <Segmented value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "", label: "الكل" }, ...(summary.data?.statuses.map((item) => ({ value: item.value, label: item.label })) ?? [])]} />
            </div>
            <DataTable
              rows={shipments.data?.data}
              loading={shipments.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
              columns={[
                { key: "carrier", header: "الشحنة", cell: (row) => <CarrierCell shipment={row} /> },
                { key: "recipient", header: "العميل", cell: (row) => row.recipient.name },
                { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.cod.amount} className="font-bold" /> },
                { key: "shipment", header: "حالة الشحنة", cell: (row) => <EnumBadge value={row.status} /> },
                { key: "cod", header: "حالة التحصيل", cell: (row) => <EnumBadge value={row.cod.status} /> },
                { key: "credited", header: "تاريخ الإيداع", cell: (row) => <span className="num text-xs text-ink-muted">{row.cod.credited_at ? formatDateTime(row.cod.credited_at) : "—"}</span> },
              ]}
              empty={<EmptyState icon={<Banknote />} title="لا توجد شحنات دفع عند الاستلام" />}
            />
            <Pagination meta={shipments.data?.meta} onPage={setPage} />
          </Card>
        </TabsContent>
        <TabsContent value="payouts">
          <Card>
            <DataTable
              rows={payouts.data?.data}
              loading={payouts.isLoading}
              rowKey={(row) => row.id}
              columns={[
                { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.amount} className="font-bold" /> },
                { key: "iban", header: "الحساب", cell: (row) => <><p className="num text-sm" dir="ltr" style={{ textAlign: "right" }}>{row.iban}</p><p className="text-xs text-ink-subtle">{row.bank_name}</p></> },
                { key: "status", header: "الحالة", cell: (row) => <><EnumBadge value={row.status} />{row.rejection_reason && <p className="mt-1 text-xs text-rose-600">{row.rejection_reason}</p>}</> },
                { key: "ref", header: "مرجع التحويل", cell: (row) => <span className="num text-sm">{row.transfer_reference ?? "—"}</span> },
                { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
              ]}
              empty={<EmptyState icon={<Landmark />} title="لا توجد طلبات تحويل" />}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="طلب تحويل بنكي" description={`يُخصم المبلغ من المحفظة ويُحوَّل إلى حسابك خلال يوم عمل. الحد الأدنى ${session.config.min_payout.formatted}.`}>
          {merchant?.iban ? (
            <>
              <div className="rounded-lg border border-line bg-surface-muted p-4 text-sm">
                <p className="text-ink-subtle">سيتم التحويل إلى</p>
                <p className="mt-1 font-bold">{merchant.account_holder} · {merchant.bank_name}</p>
                <p className="num mt-0.5" dir="ltr" style={{ textAlign: "right" }}>{merchant.iban}</p>
              </div>
              <Field label="المبلغ" htmlFor="po-amount" className="mt-4" hint={<>الرصيد المتاح: <Money value={session.wallet} /></>}>
                <Input id="po-amount" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} endAdornment="ر.س" className="num text-lg font-bold" />
              </Field>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={() => request.mutate()} loading={request.isPending} disabled={!Number(amount)}>تأكيد الطلب</Button>
              </DialogFooter>
            </>
          ) : (
            <EmptyState icon={<Landmark />} title="أضف حسابك البنكي أولاً" description="نحتاج رقم الآيبان واسم صاحب الحساب لتحويل المبالغ." action={<Button asChild><Link href="/dashboard/settings?tab=bank">إضافة الحساب البنكي</Link></Button>} className="py-6" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
