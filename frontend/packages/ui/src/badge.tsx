import * as React from "react";
import { cn } from "./cn";

/** Semantic tone names match the `color` field returned by the API for every enum. */
export type Tone = "gray" | "blue" | "indigo" | "sky" | "amber" | "orange" | "green" | "red" | "rose" | "navy";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:ring-indigo-900",
  sky: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  orange: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-900",
  green: "bg-green-50 text-green-800 ring-green-200 dark:bg-green-900/40 dark:text-green-200 dark:ring-green-800",
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900",
  rose: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900",
  navy: "bg-navy-900 text-white ring-navy-900",
};

const dots: Record<Tone, string> = {
  gray: "bg-slate-400", blue: "bg-blue-500", indigo: "bg-indigo-500", sky: "bg-sky-500", amber: "bg-amber-500",
  orange: "bg-orange-500", green: "bg-green-500", red: "bg-red-500", rose: "bg-rose-500", navy: "bg-green-400",
};

export function Badge({ tone = "gray", dot, className, children }: { tone?: Tone | string; dot?: boolean; className?: string; children: React.ReactNode }) {
  const t = (tone in tones ? tone : "gray") as Tone;

  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset", tones[t], className)}>
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", dots[t])} />}
      {children}
    </span>
  );
}

/** Renders any API enum presented as `{ value, label, color }`. */
export function EnumBadge({ value, className }: { value?: { label: string; color: string } | null; className?: string }) {
  if (!value) return <span className="text-ink-subtle">—</span>;
  return <Badge tone={value.color} dot className={className}>{value.label}</Badge>;
}

export const toneText: Record<Tone, string> = {
  gray: "text-slate-600", blue: "text-blue-600", indigo: "text-indigo-600", sky: "text-sky-600", amber: "text-amber-600",
  orange: "text-orange-600", green: "text-green-600", red: "text-red-600", rose: "text-rose-600", navy: "text-navy-900",
};
