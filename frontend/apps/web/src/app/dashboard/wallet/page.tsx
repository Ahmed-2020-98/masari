"use client";

import { api, ApiError, type Enum, type Money as MoneyValue, type Topup, type WalletTransaction } from "@masari/api";
import { formatDateTime } from "@masari/i18n";
import {
  Button, Card, DataTable, Dialog, DialogContent, DialogFooter, EmptyState, EnumBadge, Field, Input, Money, NativeSelect, PageHeader, Pagination, Segmented, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, toast,
} from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Copy, CreditCard, Landmark, Plus, Receipt, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRefreshSession, useSession } from "@/lib/session";
import { usePaginated } from "@/lib/use-paginated";

type WalletSummary = { balance: MoneyValue; credit_limit: MoneyValue; pending_topups: MoneyValue; last_30_days: { credits: MoneyValue; debits: MoneyValue }; types: Enum[] };

const PRESETS = [200, 500, 1000, 2500];

function TopupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { config } = useSession();
  const client = useQueryClient();
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [amount, setAmount] = useState("500");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [bank, setBank] = useState(config.bank_accounts[0]?.bank ?? "");
  const [reference, setReference] = useState("");

  const card = useMutation({
    mutationFn: () => api<{ payment_url: string }>("merchant/topups/card", { method: "POST", body: { amount: Number(amount), redirect_url: `${window.location.origin}/dashboard/wallet` } }),
    onSuccess: (result) => { window.location.href = result.payment_url; },
    onError: (error: ApiError) => toast.error(error.message),
  });
  const transfer = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append("amount", amount);
      body.append("receipt", receipt!);
      body.append("bank_name", bank);
      if (reference) body.append("transfer_reference", reference);
      return api("merchant/topups/bank", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success("تم استلام طلبك، سيتم إضافة الرصيد بعد مراجعة الإيصال.");
      client.invalidateQueries({ queryKey: ["merchant/topups"] });
      client.invalidateQueries({ queryKey: ["wallet"] });
      onOpenChange(false);
    },
    onError: (error: ApiError) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="شحن رصيد المحفظة" description={`الحد الأدنى للشحن ${config.min_topup.formatted}`}>
        <Segmented value={method} onChange={setMethod} className="w-full [&>button]:flex-1" options={[{ value: "card", label: <span className="inline-flex items-center gap-2"><CreditCard className="size-4" />مدى / بطاقة / Apple Pay</span> }, { value: "bank", label: <span className="inline-flex items-center gap-2"><Landmark className="size-4" />تحويل بنكي</span> }]} />
        <div className="mt-5">
          <Field label="المبلغ" htmlFor="t-amount" required>
            <Input id="t-amount" type="number" inputMode="decimal" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} endAdornment="ر.س" className="num text-lg font-bold" />
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset} type="button" onClick={() => setAmount(String(preset))} className={`num rounded-full border px-3.5 py-1.5 text-sm transition ${amount === String(preset) ? "border-navy-900 bg-navy-900 text-white" : "border-line hover:border-navy-400"}`}>{preset.toLocaleString("en-US")}</button>
            ))}
          </div>
        </div>
        {method === "bank" && (
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              {config.bank_accounts.map((account) => (
                <div key={account.iban} className="rounded-lg border border-line bg-surface-muted p-3 text-sm">
                  <p className="font-bold">{account.bank}</p>
                  <p className="text-ink-muted">{account.holder}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="num tracking-wide" dir="ltr">{account.iban}</span>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(account.iban); toast.success("تم نسخ الآيبان"); }} className="grid size-8 place-items-center rounded-md hover:bg-surface" aria-label="نسخ الآيبان"><Copy className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <Field label="البنك المحوَّل إليه" htmlFor="t-bank"><NativeSelect id="t-bank" value={bank} onChange={(event) => setBank(event.target.value)}>{config.bank_accounts.map((account) => <option key={account.iban}>{account.bank}</option>)}</NativeSelect></Field>
            <Field label="رقم العملية (اختياري)" htmlFor="t-ref"><Input id="t-ref" value={reference} onChange={(event) => setReference(event.target.value)} className="num" /></Field>
            <Field label="إيصال التحويل" htmlFor="t-receipt" required hint="صورة أو PDF حتى 5 ميجابايت"><Input id="t-receipt" type="file" accept="image/*,application/pdf" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} className="pt-2" /></Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          {method === "card" ? (
            <Button onClick={() => card.mutate()} loading={card.isPending} disabled={!Number(amount)}><CreditCard />الدفع الآن</Button>
          ) : (
            <Button onClick={() => transfer.mutate()} loading={transfer.isPending} disabled={!Number(amount) || !receipt}>إرسال الإيصال</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletPage() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const refreshSession = useRefreshSession();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"" | "in" | "out">("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [topupPage, setTopupPage] = useState(1);

  const summary = useQuery({ queryKey: ["wallet"], queryFn: () => api<WalletSummary>("merchant/wallet") });
  const transactions = usePaginated<WalletTransaction>("merchant/wallet/transactions", { direction, type, page });
  const topups = usePaginated<Topup>("merchant/topups", { page: topupPage });

  useEffect(() => {
    const topupId = params.get("topup");
    if (!topupId) return;
    api<{ data: Topup }>(`merchant/topups/${topupId}`).then((result) => {
      if (result.data.status.value === "paid") toast.success(`تمت إضافة ${result.data.amount.formatted} إلى محفظتك`);
      else if (result.data.status.value === "failed") toast.error("لم تكتمل عملية الدفع، لم يتم خصم أي مبلغ.");
      client.invalidateQueries();
      refreshSession();
      router.replace("/dashboard/wallet");
    });
  }, [params, client, refreshSession, router]);

  const balance = summary.data?.balance;

  return (
    <>
      <PageHeader title="المحفظة" description="رصيد واحد لجميع شركات الشحن مع كشف حساب تفصيلي." actions={<Button onClick={() => setOpen(true)}><Plus />شحن الرصيد</Button>} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card className="grain relative overflow-hidden border-0 bg-navy-900 p-6 text-white">
          <div className="flex items-center justify-between"><p className="text-white/70">الرصيد المتاح</p><Wallet className="size-6 text-green-400" aria-hidden /></div>
          {summary.isLoading ? <Skeleton className="mt-3 h-12 w-52 bg-white/10" /> : <Money value={balance} className={`mt-2 block text-4xl font-black ${balance && balance.amount < 0 ? "text-rose-300" : ""}`} />}
          {!!summary.data?.pending_topups.amount && <p className="mt-2 text-sm text-amber-200">قيد المراجعة: <Money value={summary.data.pending_topups} /></p>}
          <Button size="sm" className="mt-5" onClick={() => setOpen(true)}><Plus />شحن الرصيد</Button>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-ink-subtle"><span className="grid size-8 place-items-center rounded-md bg-green-50 text-green-700"><ArrowDownLeft className="size-4" aria-hidden /></span>الإيداعات (30 يوماً)</div>
          <Money value={summary.data?.last_30_days.credits} className="mt-3 block text-2xl font-extrabold text-green-700" />
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-ink-subtle"><span className="grid size-8 place-items-center rounded-md bg-rose-50 text-rose-600"><ArrowUpRight className="size-4" aria-hidden /></span>المصروفات (30 يوماً)</div>
          <Money value={summary.data?.last_30_days.debits} className="mt-3 block text-2xl font-extrabold text-rose-600" />
        </Card>
      </div>

      <Tabs defaultValue="ledger" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="ledger">كشف الحساب</TabsTrigger>
          <TabsTrigger value="topups">عمليات الشحن</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <Segmented value={direction} onChange={(value) => { setDirection(value); setPage(1); }} options={[{ value: "", label: "الكل" }, { value: "in", label: "إيداع" }, { value: "out", label: "خصم" }]} />
              <div className="w-52">
                <label className="sr-only" htmlFor="w-type">نوع العملية</label>
                <NativeSelect id="w-type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
                  <option value="">كل العمليات</option>
                  {summary.data?.types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </NativeSelect>
              </div>
            </div>
            <DataTable
              rows={transactions.data?.data}
              loading={transactions.isLoading}
              rowKey={(row) => row.id}
              columns={[
                { key: "type", header: "العملية", cell: (row) => <EnumBadge value={row.type} /> },
                { key: "description", header: "الوصف", cell: (row) => <span className="text-sm">{row.description}</span> },
                { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.amount} signed className="font-bold" /> },
                { key: "balance", header: "الرصيد بعد العملية", cell: (row) => <Money value={row.balance_after} className="text-ink-muted" /> },
                { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
              ]}
              empty={<EmptyState icon={<Receipt />} title="لا توجد عمليات" />}
            />
            <Pagination meta={transactions.data?.meta} onPage={setPage} />
          </Card>
        </TabsContent>
        <TabsContent value="topups">
          <Card>
            <DataTable
              rows={topups.data?.data}
              loading={topups.isLoading}
              rowKey={(row) => row.id}
              columns={[
                { key: "id", header: "#", cell: (row) => <span className="num text-ink-subtle">{row.id}</span> },
                { key: "method", header: "الطريقة", cell: (row) => row.method.label },
                { key: "amount", header: "المبلغ", cell: (row) => <Money value={row.amount} className="font-bold" /> },
                { key: "status", header: "الحالة", cell: (row) => <><EnumBadge value={row.status} />{row.rejection_reason && <p className="mt-1 text-xs text-rose-600">{row.rejection_reason}</p>}</> },
                { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.created_at)}</span> },
              ]}
              empty={<EmptyState icon={<CreditCard />} title="لم تقم بشحن الرصيد بعد" action={<Button onClick={() => setOpen(true)}>شحن الرصيد</Button>} />}
            />
            <Pagination meta={topups.data?.meta} onPage={setTopupPage} />
          </Card>
        </TabsContent>
      </Tabs>

      {open && <TopupDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

export default function Page() {
  return <Suspense><WalletPage /></Suspense>;
}
