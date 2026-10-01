"use client";

import { api, ApiError, type StoreOrder } from "@masari/api";
import { formatDateTime, formatPhone } from "@masari/i18n";
import { Badge, Button, Card, DataTable, EmptyState, EnumBadge, Money, PageHeader, Pagination, Segmented, toast } from "@masari/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, PlugZap, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePaginated } from "@/lib/use-paginated";

export default function OrdersPage() {
  const client = useQueryClient();
  const [status, setStatus] = useState<"pending" | "shipped" | "ignored" | "">("pending");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePaginated<StoreOrder>("merchant/orders", { status, page });

  const ignore = useMutation({
    mutationFn: (order: StoreOrder) => api(`merchant/orders/${order.id}`, { method: "PATCH", body: { status: "ignored" } }),
    onSuccess: () => { toast.success("تم تجاهل الطلب"); client.invalidateQueries({ queryKey: ["merchant/orders"] }); },
    onError: (error: ApiError) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader title="طلبات المتاجر" description="الطلبات المستوردة تلقائياً من سلة وزد. أنشئ بوليصتها بضغطة واحدة." actions={<Button asChild variant="outline"><Link href="/dashboard/integrations"><PlugZap />ربط متجر</Link></Button>} />
      <Card>
        <div className="border-b border-line p-4">
          <Segmented value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "pending", label: "بانتظار الشحن" }, { value: "shipped", label: "تم الشحن" }, { value: "ignored", label: "متجاهلة" }, { value: "", label: "الكل" }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "number", header: "الطلب", cell: (row) => <><p className="num font-bold">#{row.number}</p><p className="text-xs text-ink-subtle">{row.platform && <EnumBadge value={row.platform} />}</p></> },
            { key: "customer", header: "العميل", cell: (row) => <><p className="font-medium">{row.customer.name}</p><p className="num text-xs text-ink-subtle" dir="ltr">{formatPhone(row.customer.phone)}</p></> },
            { key: "city", header: "المدينة", cell: (row) => (row.customer.city_id ? row.customer.city_name : <Badge tone="amber">{row.customer.city_name ?? "غير محددة"} — تحتاج تعديل</Badge>) },
            { key: "items", header: "المنتجات", cell: (row) => <span className="text-sm text-ink-muted">{row.items?.map((item) => `${item.name} ×${item.quantity}`).join("، ")}</span> },
            { key: "total", header: "الإجمالي", cell: (row) => <><Money value={row.total} className="font-bold" />{row.cod_amount.amount > 0 && <p className="text-xs font-bold text-amber-700">دفع عند الاستلام</p>}</> },
            { key: "date", header: "التاريخ", cell: (row) => <span className="num text-xs text-ink-muted">{formatDateTime(row.ordered_at)}</span> },
            {
              key: "actions",
              header: "",
              cell: (row) =>
                row.status.value === "pending" ? (
                  <div className="flex justify-end gap-1.5">
                    <Button asChild size="sm"><Link href={`/dashboard/shipments/new?order=${row.id}`}><PackagePlus />شحن</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => ignore.mutate(row)}>تجاهل</Button>
                  </div>
                ) : row.shipment ? (
                  <Link href={`/dashboard/shipments/${row.shipment.id}`} className="num text-sm font-bold text-primary-text hover:underline">{row.shipment.awb}</Link>
                ) : <EnumBadge value={row.status} />,
            },
          ]}
          empty={<EmptyState icon={<ShoppingBag />} title="لا توجد طلبات" description="اربط متجرك في سلة أو زد لاستقبال الطلبات تلقائياً." action={<Button asChild><Link href="/dashboard/integrations">ربط متجر</Link></Button>} />}
        />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
