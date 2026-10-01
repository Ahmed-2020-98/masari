"use client";

import { api, ApiError, type Address, type Carrier, type Pickup, type Shipment } from "@masari/api";
import { formatDate } from "@masari/i18n";
import {
  Button, Card, CardHeader, CarrierMark, DataTable, Dialog, DialogContent, DialogFooter, EmptyState, EnumBadge, Field, Input, NativeSelect, PageHeader, Pagination, Tabs, TabsContent, TabsList, TabsTrigger, toast,
} from "@masari/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, RotateCcw, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { shipmentColumns } from "@/components/dashboard/shipment-bits";
import { usePaginated } from "@/lib/use-paginated";

const SLOTS = ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00"];

function SchedulePickup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient();
  const [tomorrow] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [carrierId, setCarrierId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [ids, setIds] = useState<Set<string | number>>(new Set());

  const carriers = useQuery({ queryKey: ["carriers"], queryFn: () => api<{ data: Carrier[] }>("merchant/carriers") });
  const senders = useQuery({ queryKey: ["addresses", "sender"], queryFn: () => api<{ data: Address[] }>("merchant/addresses", { query: { type: "sender" } }) });
  const ready = useQuery({
    queryKey: ["ready-for-pickup", carrierId],
    queryFn: () => api<{ data: Shipment[] }>("merchant/shipments", { query: { "filter[status]": "created", "filter[carrier_id]": carrierId, per_page: 100 } }),
    enabled: !!carrierId,
  });

  const submit = useMutation({
    mutationFn: () => api("merchant/pickups", { method: "POST", body: { carrier_id: Number(carrierId), address_id: Number(addressId), pickup_date: date, time_slot: slot, shipment_ids: [...ids] } }),
    onSuccess: () => {
      toast.success("تم جدولة موعد الاستلام");
      client.invalidateQueries({ queryKey: ["merchant/pickups"] });
      onOpenChange(false);
    },
    onError: (error: ApiError) => toast.error(error.message),
  });

  const pickupCarriers = useMemo(() => carriers.data?.data.filter((carrier) => carrier.supports_pickup) ?? [], [carriers.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="جدولة استلام من المستودع" description="يمر مندوب الشركة لاستلام الشحنات الجاهزة في الموعد المحدد." size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="شركة الشحن" htmlFor="pk-carrier" required>
            <NativeSelect id="pk-carrier" value={carrierId} onChange={(event) => { setCarrierId(event.target.value); setIds(new Set()); }}>
              <option value="">اختر</option>
              {pickupCarriers.map((carrier) => <option key={carrier.id} value={carrier.id}>{carrier.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="عنوان الاستلام" htmlFor="pk-address" required>
            <NativeSelect id="pk-address" value={addressId} onChange={(event) => setAddressId(event.target.value)}>
              <option value="">اختر</option>
              {senders.data?.data.map((address) => <option key={address.id} value={address.id}>{address.label ?? address.name} — {address.city?.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="التاريخ" htmlFor="pk-date" required><Input id="pk-date" type="date" min={tomorrow} value={date} onChange={(event) => setDate(event.target.value)} className="num" /></Field>
          <Field label="الفترة" htmlFor="pk-slot" required>
            <NativeSelect id="pk-slot" value={slot} onChange={(event) => setSlot(event.target.value)}>{SLOTS.map((value) => <option key={value} value={value}>{value}</option>)}</NativeSelect>
          </Field>
        </div>
        {carrierId && (
          <div className="mt-5 rounded-lg border border-line">
            <p className="border-b border-line px-4 py-2.5 text-sm font-bold">الشحنات الجاهزة للاستلام (<span className="num">{ready.data?.data.length ?? 0}</span>)</p>
            <DataTable
              rows={ready.data?.data}
              loading={ready.isLoading}
              rowKey={(row) => row.id}
              selectable
              selected={ids}
              onSelectedChange={setIds}
              columns={shipmentColumns.slice(0, 3)}
              empty={<p className="p-6 text-center text-sm text-ink-subtle">لا توجد شحنات بانتظار الاستلام لهذه الشركة.</p>}
              className="max-h-72"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => submit.mutate()} loading={submit.isPending} disabled={!carrierId || !addressId || ids.size === 0}>تأكيد الموعد ({ids.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReturnsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const returns = usePaginated<Shipment>("merchant/shipments", { "filter[type]": "return", page });
  const pickups = usePaginated<Pickup>("merchant/pickups", {});

  return (
    <>
      <PageHeader title="المرتجعات والاستلام" description="تابع شحنات الإرجاع وجدول مواعيد استلام الطرود من مستودعك." actions={<Button onClick={() => setOpen(true)}><CalendarClock />جدولة استلام</Button>} />
      <Tabs defaultValue="pickups">
        <TabsList className="mb-4">
          <TabsTrigger value="pickups"><Truck className="size-4" />مواعيد الاستلام</TabsTrigger>
          <TabsTrigger value="returns"><RotateCcw className="size-4" />شحنات الإرجاع</TabsTrigger>
        </TabsList>
        <TabsContent value="pickups">
          <Card>
            <DataTable
              rows={pickups.data?.data}
              loading={pickups.isLoading}
              rowKey={(row) => row.id}
              columns={[
                { key: "carrier", header: "الشركة", cell: (row) => row.carrier && <div className="flex items-center gap-2"><CarrierMark carrier={row.carrier} size="sm" /><span className="font-bold">{row.carrier.name}</span></div> },
                { key: "date", header: "الموعد", cell: (row) => <><p className="num font-bold">{formatDate(row.pickup_date)}</p><p className="num text-xs text-ink-subtle">{row.time_slot}</p></> },
                { key: "address", header: "العنوان", cell: (row) => `${row.address.city ?? ""} · ${row.address.district ?? ""}` },
                { key: "count", header: "الشحنات", cell: (row) => <span className="num font-bold">{row.shipments_count}</span> },
                { key: "ref", header: "مرجع الشركة", cell: (row) => <span className="num text-sm">{row.carrier_reference ?? "—"}</span> },
                { key: "status", header: "الحالة", cell: (row) => <EnumBadge value={row.status} /> },
              ]}
              empty={<EmptyState icon={<CalendarClock />} title="لا توجد مواعيد استلام" description="جدول استلاماً ليمر مندوب الشركة على مستودعك." action={<Button onClick={() => setOpen(true)}>جدولة استلام</Button>} />}
            />
          </Card>
        </TabsContent>
        <TabsContent value="returns">
          <Card>
            <CardHeader title="شحنات الإرجاع" description="أنشئ مرتجعاً من صفحة أي شحنة تم توصيلها." />
            <DataTable rows={returns.data?.data} loading={returns.isLoading} rowKey={(row) => row.id} columns={shipmentColumns} onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)} empty={<EmptyState icon={<RotateCcw />} title="لا توجد مرتجعات" />} />
            <Pagination meta={returns.data?.meta} onPage={setPage} />
          </Card>
        </TabsContent>
      </Tabs>
      {open && <SchedulePickup open={open} onOpenChange={setOpen} />}
    </>
  );
}
