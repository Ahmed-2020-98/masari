import type { Shipment } from "@masari/api";
import { CarrierMark } from "@masari/ui";

export function CarrierCell({ shipment }: { shipment: Shipment }) {
  if (!shipment.carrier) return null;
  return (
    <div className="flex items-center gap-2.5">
      <CarrierMark carrier={shipment.carrier} size="sm" />
      <div className="leading-tight"><p className="font-bold">{shipment.carrier.name}</p><p className="num text-xs text-ink-subtle">{shipment.awb}</p></div>
    </div>
  );
}

export const SHIPMENT_STATUSES = [
  ["created", "تم الإنشاء"], ["pickup_scheduled", "بانتظار الاستلام"], ["picked_up", "تم الاستلام من المتجر"], ["in_transit", "في الطريق"],
  ["out_for_delivery", "خرج للتوصيل"], ["delivered", "تم التوصيل"], ["failed_attempt", "محاولة توصيل فاشلة"], ["returned", "مرتجع"], ["cancelled", "ملغاة"],
] as const;
