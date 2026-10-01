"use client";

import { api, fileUrl, type Money as MoneyValue } from "@masari/api";
import { formatMonth } from "@masari/i18n";
import { Button, Card, DataTable, EmptyState, Money, PageHeader } from "@masari/ui";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileText } from "lucide-react";

type Invoice = { month: string; number: string; shipments: number; subtotal: MoneyValue; vat: MoneyValue; total: MoneyValue };

export default function InvoicesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => api<{ data: Invoice[] }>("merchant/invoices") });

  return (
    <>
      <PageHeader title="الفواتير" description="فواتير ضريبية شهرية مبسطة لجميع شحناتك متوافقة مع ضريبة القيمة المضافة." />
      <Card>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.month}
          columns={[
            { key: "number", header: "رقم الفاتورة", cell: (row) => <span className="num font-bold">{row.number}</span> },
            { key: "month", header: "الفترة", cell: (row) => formatMonth(row.month) },
            { key: "shipments", header: "الشحنات", cell: (row) => <span className="num">{row.shipments}</span> },
            { key: "subtotal", header: "قبل الضريبة", cell: (row) => <Money value={row.subtotal} /> },
            { key: "vat", header: "الضريبة", cell: (row) => <Money value={row.vat} /> },
            { key: "total", header: "الإجمالي", cell: (row) => <Money value={row.total} className="font-bold" /> },
            { key: "download", header: "", cell: (row) => <Button asChild size="sm" variant="outline"><a href={fileUrl(`merchant/invoices/${row.month}`)} target="_blank" rel="noopener"><FileDown />PDF</a></Button> },
          ]}
          empty={<EmptyState icon={<FileText />} title="لا توجد فواتير بعد" description="تصدر الفاتورة تلقائياً لكل شهر به شحنات." />}
        />
      </Card>
    </>
  );
}
