import type { Shipment } from "@masari/api";
import { formatPhone } from "@masari/i18n";
import { CarrierMark, type Column, EnumBadge, Money } from "@masari/ui";
import { formatShortDate } from "@masari/i18n";

export function CarrierCell({ shipment }: { shipment: Shipment }) {
  if (!shipment.carrier) return null;
  return (
    <div className="flex items-center gap-2.5">
      <CarrierMark carrier={shipment.carrier} size="sm" />
      <div className="leading-tight">
        <p className="font-bold">{shipment.carrier.name}</p>
        <p className="num text-xs text-ink-subtle">{shipment.awb ?? "—"}</p>
      </div>
    </div>
  );
}

export const shipmentColumns: Column<Shipment>[] = [
  { key: "carrier", header: "الشركة / رقم التتبع", cell: (row) => <CarrierCell shipment={row} /> },
  {
    key: "recipient",
    header: "المستلم",
    cell: (row) => (
      <div className="leading-tight">
        <p className="font-medium">{row.recipient.name}</p>
        <p className="num text-xs text-ink-subtle" dir="ltr">{formatPhone(row.recipient.phone)}</p>
      </div>
    ),
  },
  { key: "city", header: "المدينة", cell: (row) => row.recipient.city ?? "—" },
  { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
  { key: "cod", header: "الدفع عند الاستلام", cell: (row) => (row.cod.amount.amount > 0 ? <Money value={row.cod.amount} /> : <span className="text-ink-subtle">مدفوعة</span>) },
  { key: "total", header: "التكلفة", cell: (row) => <Money value={row.total} className="font-bold" /> },
  { key: "date", header: "التاريخ", cell: (row) => <span className="num text-ink-muted">{formatShortDate(row.created_at)}</span> },
];
