import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { type Tone, toneText } from "./badge";

/* -------------------------------- Skeleton --------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-navy-100/60 dark:bg-navy-800", className)} />;
}

/* ------------------------------- Empty state ------------------------------- */

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-green-50 text-green-700 ring-8 ring-green-50/50 dark:bg-green-900/30 [&_svg]:size-7">
        {icon ?? <Inbox />}
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-subtle">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------- Page header ------------------------------- */

export function PageHeader({ title, description, actions, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-bold text-primary-text">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-ink-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* --------------------------------- KPI card -------------------------------- */

export function KpiCard({ label, value, icon, tone = "green", hint, loading, className }: { label: string; value: React.ReactNode; icon?: React.ReactNode; tone?: Tone; hint?: React.ReactNode; loading?: boolean; className?: string }) {
  const bg: Partial<Record<Tone, string>> = {
    green: "bg-green-50 dark:bg-green-900/30", blue: "bg-blue-50 dark:bg-blue-950", amber: "bg-amber-50 dark:bg-amber-950",
    rose: "bg-rose-50 dark:bg-rose-950", navy: "bg-navy-50 dark:bg-navy-800", indigo: "bg-indigo-50 dark:bg-indigo-950", sky: "bg-sky-50 dark:bg-sky-950",
  };

  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop md:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-subtle">{label}</p>
          {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="num mt-1.5 truncate text-2xl font-bold text-ink md:text-[28px]">{value}</p>}
        </div>
        {icon && <div className={cn("grid size-10 shrink-0 place-items-center rounded-md [&_svg]:size-5", bg[tone] ?? bg.green, toneText[tone])}>{icon}</div>}
      </div>
      {hint && <div className="mt-2 text-xs text-ink-subtle">{hint}</div>}
    </div>
  );
}

/* ---------------------------------- Money ---------------------------------- */

export type MoneyValue = { amount: number; value: number; formatted: string };

const moneyFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

export function Money({ value, className, signed, currency = true }: { value?: MoneyValue | null; className?: string; signed?: boolean; currency?: boolean }) {
  if (!value) return <span className="text-ink-subtle">—</span>;
  const negative = value.amount < 0;

  return (
    <span className={cn("num whitespace-nowrap", signed && (negative ? "text-rose-600" : value.amount > 0 ? "text-green-700 dark:text-green-300" : ""), className)}>
      {signed && value.amount > 0 ? "+" : negative ? "−" : ""}
      {formatMoney(Math.abs(value.value))}
      {currency && <span className="ms-1 text-[0.8em] font-medium opacity-70">ر.س</span>}
    </span>
  );
}

/* ---------------------------------- Table ---------------------------------- */

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export function DataTable<T>({
  columns,
  rows,
  loading,
  rowKey,
  onRowClick,
  empty,
  selectable,
  selected,
  onSelectedChange,
  className,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  selectable?: boolean;
  selected?: Set<string | number>;
  onSelectedChange?: (next: Set<string | number>) => void;
  className?: string;
}) {
  const allKeys = (rows ?? []).map(rowKey);
  const allSelected = selectable && allKeys.length > 0 && allKeys.every((key) => selected?.has(key));

  const toggle = (key: string | number) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedChange?.(next);
  };

  return (
    <div className={cn("overflow-x-auto scrollbar-thin", className)}>
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-start">
            {selectable && (
              <th className="w-10 border-b border-line bg-surface-muted px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="تحديد الكل"
                  className="size-4 accent-navy-900"
                  checked={!!allSelected}
                  onChange={() => onSelectedChange?.(allSelected ? new Set() : new Set(allKeys))}
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn("whitespace-nowrap border-b border-line bg-surface-muted px-4 py-3 text-start text-xs font-bold text-ink-subtle", column.headerClassName)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={index}>
                {selectable && <td className="border-b border-line px-4 py-4"><Skeleton className="size-4" /></td>}
                {columns.map((column) => (
                  <td key={column.key} className="border-b border-line px-4 py-4">
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            rows?.map((row) => {
              const key = rowKey(row);
              const isSelected = selected?.has(key);

              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn("group transition-colors", onRowClick && "cursor-pointer hover:bg-green-50/40 dark:hover:bg-navy-800/60", isSelected && "bg-green-50/60 dark:bg-navy-800")}
                >
                  {selectable && (
                    <td className="border-b border-line px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" aria-label="تحديد" className="size-4 accent-navy-900" checked={!!isSelected} onChange={() => toggle(key)} />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={cn("border-b border-line px-4 py-3.5 align-middle text-ink", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      {!loading && rows?.length === 0 && (empty ?? <EmptyState title="لا توجد بيانات" description="لم يتم العثور على نتائج مطابقة." />)}
    </div>
  );
}

export type PaginationMeta = { current_page: number; last_page: number; total: number; per_page: number; from: number | null; to: number | null };

export function Pagination({ meta, onPage }: { meta?: PaginationMeta; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) {
    return meta ? <div className="px-4 py-3 text-xs text-ink-subtle">{meta.total} نتيجة</div> : null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-ink-subtle">
        عرض <span className="num">{meta.from}</span>–<span className="num">{meta.to}</span> من <span className="num">{meta.total}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => onPage(meta.current_page - 1)} disabled={meta.current_page <= 1} aria-label="الصفحة السابقة">
          <ChevronRight />
        </Button>
        <span className="num min-w-16 text-center text-ink-muted">
          {meta.current_page} / {meta.last_page}
        </span>
        <Button variant="outline" size="icon-sm" onClick={() => onPage(meta.current_page + 1)} disabled={meta.current_page >= meta.last_page} aria-label="الصفحة التالية">
          <ChevronLeft />
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------- Carrier tile ------------------------------ */

export type CarrierLike = { name: string; name_en?: string; code: string; brand_color?: string | null; logo?: string | null };

const CARRIER_MONOGRAMS: Record<string, string> = {
  smsa: "SMSA", aramex: "ARX", spl: "SPL", jt: "J&T", dhl: "DHL", naqel: "NQL", imile: "iM", redbox: "RBX",
};

/** Carrier identity chip: logo when uploaded, otherwise a branded monogram. */
export function CarrierMark({ carrier, size = "md", className }: { carrier: CarrierLike; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-8 text-[10px]", md: "size-10 text-[11px]", lg: "size-14 text-sm" };
  const label = CARRIER_MONOGRAMS[carrier.code] ?? carrier.code.slice(0, 4).toUpperCase();
  const color = carrier.brand_color ?? "#0F2741";
  const lightBg = ["#FFCC00"].includes(color.toUpperCase());

  if (carrier.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={carrier.logo} alt={carrier.name} className={cn("rounded-md border border-line bg-white object-contain p-1", sizes[size], className)} />;
  }

  return (
    <span
      aria-hidden
      className={cn("num grid shrink-0 place-items-center rounded-md font-extrabold tracking-tight shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]", sizes[size], className)}
      style={{ backgroundColor: color, color: lightBg ? "#D40511" : "#fff" }}
    >
      {label}
    </span>
  );
}

/* --------------------------------- Timeline -------------------------------- */

export type TimelineEvent = { id: number | string; status: { label: string; color: string; value: string }; description: string; location?: string | null; occurred_at: string };

export function Timeline({ events, formatDate }: { events: TimelineEvent[]; formatDate: (iso: string) => string }) {
  return (
    <ol className="relative">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < events.length - 1 && <span aria-hidden className="absolute start-[11px] top-7 h-[calc(100%-1.25rem)] w-0.5 bg-line" />}
          <span
            aria-hidden
            className={cn(
              "relative z-10 mt-1 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-surface",
              index === 0 ? "bg-green-500 animate-pulse-ring" : "bg-navy-100 dark:bg-navy-700",
            )}
          >
            <span className={cn("size-2 rounded-full", index === 0 ? "bg-navy-900" : "bg-navy-400")} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <p className={cn("font-bold", index === 0 ? "text-ink" : "text-ink-muted")}>{event.description}</p>
              <time className="num text-xs text-ink-subtle" dateTime={event.occurred_at}>{formatDate(event.occurred_at)}</time>
            </div>
            {event.location && <p className="mt-0.5 text-sm text-ink-subtle">{event.location}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* --------------------------------- Stepper --------------------------------- */

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={step} className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "num grid size-8 place-items-center rounded-full text-sm font-bold transition",
                state === "done" && "bg-green-500 text-navy-900",
                state === "active" && "bg-navy-900 text-white ring-4 ring-navy-900/10 dark:bg-green-500 dark:text-navy-900",
                state === "todo" && "bg-surface-muted text-ink-subtle ring-1 ring-line",
              )}
              aria-current={state === "active" ? "step" : undefined}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            <span className={cn("text-sm", state === "todo" ? "text-ink-subtle" : "font-bold text-ink")}>{step}</span>
            {index < steps.length - 1 && <span aria-hidden className={cn("mx-1 h-0.5 w-6 rounded md:w-10", index < current ? "bg-green-500" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------ Segmented control --------------------------- */

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (value: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-md border border-line bg-surface-muted p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-9 rounded-sm px-3.5 text-sm font-medium text-ink-subtle transition",
            value === option.value && "bg-surface font-bold text-ink shadow-card",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
