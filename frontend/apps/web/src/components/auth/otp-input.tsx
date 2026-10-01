"use client";

import { cn } from "@masari/ui";
import { useRef } from "react";

/** Segmented one-time-code input (LTR digits, paste + autofill friendly). */
export function OtpInput({ length = 4, value, onChange, invalid, autoFocus }: { length?: number; value: string; onChange: (value: string) => void; invalid?: boolean; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (index: number, digit: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit || " ";
    onChange(chars.join("").replace(/\s+$/, "").replace(/\s/g, ""));
  };

  return (
    <div dir="ltr" className="flex justify-center gap-3" role="group" aria-label="رمز التحقق">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node; }}
          value={value[index] ?? ""}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          maxLength={length}
          aria-label={`الرقم ${index + 1}`}
          aria-invalid={invalid || undefined}
          className={cn(
            "num size-14 rounded-lg border border-line bg-surface text-center text-2xl font-bold text-ink transition focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/15 sm:size-16",
            invalid && "border-rose-500",
          )}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            if (digits.length > 1) {
              onChange(digits.slice(0, length));
              refs.current[Math.min(digits.length, length) - 1]?.focus();
              return;
            }
            setAt(index, digits);
            if (digits && index < length - 1) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value[index] && index > 0) refs.current[index - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
