/**
 * Domain types mirroring the Laravel API resources (app/Http/Resources).
 * The generated `schema.d.ts` (from /docs/api.json) is the full contract; these are the ergonomic shapes used in the UI.
 */

export type Enum<V extends string = string> = { value: V; label: string; color: string };
export type Money = { amount: number; value: number; formatted: string };

export type Paginated<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; total: number; per_page: number; from: number | null; to: number | null };
};

export type ShipmentStatus =
  | "draft" | "created" | "pickup_scheduled" | "picked_up" | "in_transit"
  | "out_for_delivery" | "delivered" | "failed_attempt" | "returned" | "cancelled";

export type Carrier = {
  id: number;
  code: string;
  name: string;
  name_en: string;
  logo: string | null;
  brand_color: string | null;
  supports_cod: boolean;
  supports_pickup: boolean;
  supports_returns: boolean;
  is_active: boolean;
  driver?: string;
  services?: CarrierService[];
  shipments_count?: number;
};

export type CarrierRate = { id: number; zone: Enum; base_weight_kg: number; base_price: Money; extra_kg_price: Money };

export type CarrierService = {
  id: number;
  code: string;
  name: string;
  eta_min_days: number;
  eta_max_days: number;
  max_weight_kg: number;
  is_active: boolean;
  rates?: CarrierRate[];
};

export type City = { id: number; name: string; name_en: string; region_id: number; region?: string; is_remote: boolean };
export type Region = { id: number; name: string; cities: City[] };

export type Party = {
  name: string;
  phone: string;
  email?: string | null;
  city_id: number;
  city?: string;
  district?: string | null;
  street?: string | null;
  building_no?: string | null;
  postal_code?: string | null;
  short_address?: string | null;
};

export type ShipmentEvent = { id: number; status: Enum<ShipmentStatus>; description: string; location: string | null; occurred_at: string };

export type Shipment = {
  id: string;
  reference: string;
  awb: string | null;
  type: Enum<"outbound" | "return">;
  source: string;
  status: Enum<ShipmentStatus>;
  is_cancellable: boolean;
  order_number: string | null;
  carrier?: Carrier;
  service?: { id: number; code: string; name: string };
  sender: Party;
  recipient: Party;
  zone: Enum;
  pieces: number;
  weight_kg: number;
  chargeable_weight_kg: number;
  dimensions: { length?: number; width?: number; height?: number } | null;
  contents: string | null;
  declared_value: Money;
  cod: { amount: Money; status: Enum | null; credited_at: string | null };
  price: Money;
  vat: Money;
  total: Money;
  carrier_cost?: Money;
  merchant?: { id: number; store_name: string };
  has_label: boolean;
  tracking_url: string;
  events?: ShipmentEvent[];
  notes: string | null;
  parent_id?: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  carrier_service_id: number;
  carrier: Pick<Carrier, "id" | "code" | "name" | "logo" | "brand_color" | "supports_cod">;
  service: { code: string; name: string };
  eta: { min_days: number; max_days: number; label: string };
  zone: Enum;
  chargeable_weight_kg: number;
  shipping: Money;
  cod_fee: Money;
  price: Money;
  vat: Money;
  total: Money;
  is_cheapest?: boolean;
  is_fastest?: boolean;
};

export type Address = Party & { id: number; type: "sender" | "recipient"; label: string | null; city?: City; notes: string | null; is_default: boolean };

export type Plan = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  markup_type?: "percent" | "fixed";
  markup_value?: number;
  cod_fee: Money;
  return_fee: Money;
  monthly_fee: Money;
  features: string[];
  is_default: boolean;
  is_active: boolean;
  merchants_count?: number;
};

export type Merchant = {
  id: number;
  name: string;
  store_name: string;
  store_url: string | null;
  email: string | null;
  phone: string;
  commercial_registration: string | null;
  vat_number: string | null;
  iban: string | null;
  bank_name: string | null;
  account_holder: string | null;
  status: Enum<"pending" | "active" | "suspended">;
  monthly_volume: string | null;
  plan?: Plan;
  wallet_balance?: Money;
  role?: Enum;
  shipments_count?: number;
  created_at: string;
};

export type User = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  type: Enum<"merchant" | "admin">;
  is_active: boolean;
  roles?: string[];
  last_login_at: string | null;
  created_at: string;
};

export type Bootstrap = {
  user: User;
  merchant: Merchant | null;
  merchants: { id: number; store_name: string; role: Enum }[];
  role: Enum | null;
  abilities: string[];
  admin_permissions: string[];
  wallet: Money | null;
  unread_notifications: number;
  open_tickets: number;
  config: {
    vat_rate: number;
    min_topup: Money;
    min_payout: Money;
    mobile_min_version: string;
    payment_driver: "fake" | "tap";
    bank_accounts: { bank: string; holder: string; iban: string }[];
  };
};

export type WalletTransaction = { id: number; type: Enum; amount: Money; balance_after: Money; description: string; reference: { type: string; id: number } | null; created_at: string };

export type Topup = {
  id: number;
  method: Enum<"card" | "bank_transfer">;
  amount: Money;
  status: Enum<"pending" | "paid" | "failed" | "rejected">;
  bank_name: string | null;
  transfer_reference: string | null;
  has_receipt: boolean;
  rejection_reason: string | null;
  merchant?: { id: number; store_name: string };
  reviewed_at: string | null;
  created_at: string;
};

export type Payout = {
  id: number;
  amount: Money;
  iban: string;
  bank_name: string | null;
  account_holder: string;
  status: Enum<"pending" | "approved" | "rejected">;
  transfer_reference: string | null;
  rejection_reason: string | null;
  merchant?: { id: number; store_name: string };
  reviewed_at: string | null;
  created_at: string;
};

export type Pickup = {
  id: number;
  carrier?: Carrier;
  address: Record<string, string>;
  pickup_date: string;
  time_slot: string;
  shipments_count: number;
  status: Enum;
  carrier_reference: string | null;
  notes: string | null;
  created_at: string;
};

export type StoreConnection = {
  id: number;
  platform: Enum<"salla" | "zid">;
  store_id: string;
  store_name: string | null;
  store_url: string | null;
  status: string;
  settings: { auto_ship: boolean; carrier_service_id: number | null; sender_address_id: number | null };
  orders_count?: number;
  last_synced_at: string | null;
  created_at: string;
};

export type StoreOrder = {
  id: number;
  platform?: Enum<"salla" | "zid">;
  store_name?: string;
  external_id: string;
  number: string;
  customer: Party & { city_name?: string; city_id: number | null };
  items: { name: string; quantity: number; sku?: string | null }[] | null;
  total: Money;
  payment_method: string | null;
  cod_amount: Money;
  weight_kg: number;
  status: Enum<"pending" | "shipped" | "ignored">;
  shipment?: { id: string; awb: string | null } | null;
  ordered_at: string | null;
};

export type TicketMessage = { id: number; body: string; is_staff: boolean; author?: string | null; attachments: { name: string; path: string }[]; created_at: string };

export type Ticket = {
  id: number;
  number: string;
  subject: string;
  category: Enum;
  priority: string;
  status: Enum<"open" | "pending" | "answered" | "closed">;
  shipment?: { id: string; awb: string | null } | null;
  merchant?: { id: number; store_name: string };
  assignee?: { id: number; name: string } | null;
  messages?: TicketMessage[];
  last_reply_at: string | null;
  created_at: string;
};

export type WebhookEndpoint = { id: number; url: string; events: string[]; is_active: boolean; secret?: string; last_success_at: string | null; last_failure_at: string | null; created_at: string };

export type AppNotification = { id: string; kind: string; title: string; body: string; color: string; data: Record<string, string>; read_at: string | null; created_at: string };

export type ActivityLog = { id: number; action: string; user?: string | null; merchant?: string | null; subject: { type: string; id: number } | null; properties: Record<string, unknown> | null; ip_address: string | null; created_at: string };

export type CodSettlement = { id: number; carrier?: Carrier; reference: string | null; shipments_count: number; total_amount: Money; remitted_on: string | null; notes: string | null; created_at: string };
