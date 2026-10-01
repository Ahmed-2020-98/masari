"use client";

import { Dialog as D, DropdownMenu as DM, Tabs as T, Tooltip as TT, Checkbox as CB, Switch as SW, Popover as PO } from "radix-ui";
import { Check, X } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

/* ---------------------------------- Dialog --------------------------------- */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ title, description, children, className, size = "md" }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-[2px] data-[state=open]:animate-fade" />
      <D.Content
        className={cn(
          "fixed inset-x-0 top-1/2 z-50 mx-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-pop outline-none data-[state=open]:animate-rise",
          widths[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <D.Title className="text-lg font-bold text-ink">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-ink-subtle">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="-me-2 rounded-md p-2 text-ink-subtle transition hover:bg-surface-muted hover:text-ink" aria-label="إغلاق">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("-mx-6 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted px-6 py-4", className)}>{children}</div>;
}

/* ---------------------------------- Sheet ---------------------------------- */

export function SheetContent({ title, description, children, className, side = "end" }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; side?: "start" | "end" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-navy-950/40 data-[state=open]:animate-fade" />
      <D.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-full max-w-xl flex-col bg-surface shadow-pop outline-none transition-transform data-[state=open]:animate-fade",
          side === "end" ? "end-0 border-s border-line" : "start-0 border-e border-line",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <D.Title className="text-lg font-bold text-ink">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-sm text-ink-subtle">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="-me-2 rounded-md p-2 text-ink-subtle hover:bg-surface-muted hover:text-ink" aria-label="إغلاق">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

/* ------------------------------ Dropdown menu ------------------------------ */

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={6} className={cn("z-50 min-w-48 rounded-md border border-line bg-surface p-1.5 shadow-pop data-[state=open]:animate-fade", className)}>
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function DropdownMenuItem({ className, tone, ...props }: React.ComponentProps<typeof DM.Item> & { tone?: "danger" }) {
  return (
    <DM.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-muted data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-ink-subtle",
        tone === "danger" && "text-rose-600 [&_svg]:text-rose-500",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="-mx-1.5 my-1.5 h-px bg-line" />;
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <DM.Label className="px-2.5 py-1.5 text-xs font-medium text-ink-subtle">{children}</DM.Label>;
}

/* ---------------------------------- Tabs ----------------------------------- */

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("flex gap-1 overflow-x-auto border-b border-line scrollbar-thin", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "relative -mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3.5 text-sm font-medium text-ink-subtle transition hover:text-ink data-[state=active]:border-green-500 data-[state=active]:font-bold data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------- Tooltip -------------------------------- */

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TT.Provider delayDuration={200}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content sideOffset={6} className="z-50 max-w-xs rounded-sm bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-pop data-[state=delayed-open]:animate-fade">
            {content}
            <TT.Arrow className="fill-navy-900" />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}

/* --------------------------------- Popover --------------------------------- */

export const Popover = PO.Root;
export const PopoverTrigger = PO.Trigger;
export const PopoverAnchor = PO.Anchor;

export function PopoverContent({ className, align = "start", ...props }: React.ComponentProps<typeof PO.Content>) {
  return (
    <PO.Portal>
      <PO.Content align={align} sideOffset={6} className={cn("z-50 rounded-md border border-line bg-surface p-2 shadow-pop outline-none data-[state=open]:animate-fade", className)} {...props} />
    </PO.Portal>
  );
}

/* ----------------------------- Checkbox / Switch ---------------------------- */

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CB.Root>) {
  return (
    <CB.Root
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-surface transition hover:border-navy-400 data-[state=checked]:border-navy-900 data-[state=checked]:bg-navy-900 data-[state=indeterminate]:border-navy-900 data-[state=indeterminate]:bg-navy-900",
        className,
      )}
      {...props}
    >
      <CB.Indicator className="text-white">
        {props.checked === "indeterminate" ? <span className="block h-0.5 w-2.5 rounded bg-white" /> : <Check className="size-3.5" strokeWidth={3} />}
      </CB.Indicator>
    </CB.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SW.Root>) {
  return (
    <SW.Root className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-line-strong transition data-[state=checked]:bg-green-500", className)} {...props}>
      <SW.Thumb className="block size-5 translate-x-[-2px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[-22px] ltr:translate-x-[2px] ltr:data-[state=checked]:translate-x-[22px]" />
    </SW.Root>
  );
}
