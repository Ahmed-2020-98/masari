"use client";

import { Input } from "@masari/ui";

export function PhoneInput(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  return (
    <div dir="ltr" className="flex">
      <span className="num flex h-11 items-center rounded-s-md border border-e-0 border-line bg-surface-muted px-3 text-sm text-ink-muted">+966</span>
      <Input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="05X XXX XXXX" className="num rounded-s-none text-start" {...props} />
    </div>
  );
}
