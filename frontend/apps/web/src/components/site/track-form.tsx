"use client";

import { Button } from "@masari/ui";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackForm({ variant = "dark", defaultValue = "" }: { variant?: "dark" | "light"; defaultValue?: string }) {
  const router = useRouter();
  const [awb, setAwb] = useState(defaultValue);
  const dark = variant === "dark";

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const value = awb.trim();
        if (value) router.push(`/track/${encodeURIComponent(value)}`);
      }}
      className={dark ? "rounded-xl border border-white/15 bg-white/5 p-2 backdrop-blur" : "rounded-xl border border-line bg-surface p-2 shadow-card"}
    >
      <label htmlFor="track-awb" className={dark ? "sr-only" : "sr-only"}>رقم التتبع</label>
      <div className="flex items-center gap-2">
        <Search className={`ms-2 size-5 shrink-0 ${dark ? "text-white/50" : "text-ink-subtle"}`} aria-hidden />
        <input
          id="track-awb"
          value={awb}
          onChange={(event) => setAwb(event.target.value)}
          placeholder="أدخل رقم التتبع أو رقم البوليصة"
          className={`num h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none ${dark ? "text-white placeholder:text-white/45" : "text-ink placeholder:text-ink-subtle"}`}
          autoComplete="off"
          inputMode="text"
        />
        <Button type="submit" variant={dark ? "primary" : "navy"} className="shrink-0">تتبع</Button>
      </div>
    </form>
  );
}
