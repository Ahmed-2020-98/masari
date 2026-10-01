import {
  Banknote, Bell, Boxes, FileSpreadsheet, FileText, Headset, LayoutDashboard, MapPin, PackagePlus, PlugZap, RotateCcw, Settings, ShoppingBag, Truck, Users, Wallet,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: typeof Truck; ability?: string; exact?: boolean };

export const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/shipments", label: "الشحنات", icon: Truck, ability: "shipments" },
      { href: "/dashboard/shipments/new", label: "إنشاء شحنة", icon: PackagePlus, ability: "shipments" },
      { href: "/dashboard/shipments/bulk", label: "رفع جماعي", icon: FileSpreadsheet, ability: "shipments" },
      { href: "/dashboard/orders", label: "طلبات المتاجر", icon: ShoppingBag, ability: "orders" },
      { href: "/dashboard/returns", label: "المرتجعات والاستلام", icon: RotateCcw, ability: "shipments" },
    ],
  },
  {
    title: "المالية",
    items: [
      { href: "/dashboard/wallet", label: "المحفظة", icon: Wallet, ability: "wallet" },
      { href: "/dashboard/cod", label: "الدفع عند الاستلام", icon: Banknote, ability: "cod" },
      { href: "/dashboard/invoices", label: "الفواتير", icon: FileText, ability: "invoices" },
    ],
  },
  {
    title: "الإعدادات",
    items: [
      { href: "/dashboard/addresses", label: "العناوين", icon: MapPin, ability: "addresses" },
      { href: "/dashboard/integrations", label: "الربط والتكامل", icon: PlugZap, ability: "integrations" },
      { href: "/dashboard/team", label: "فريق العمل", icon: Users, ability: "team" },
      { href: "/dashboard/support", label: "الدعم الفني", icon: Headset, ability: "tickets" },
      { href: "/dashboard/notifications", label: "الإشعارات", icon: Bell },
      { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

export const mobileNav: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/shipments", label: "الشحنات", icon: Truck, ability: "shipments" },
  { href: "/dashboard/shipments/new", label: "إنشاء", icon: PackagePlus, ability: "shipments" },
  { href: "/dashboard/wallet", label: "المحفظة", icon: Wallet, ability: "wallet" },
];

export const boxesIcon = Boxes;
