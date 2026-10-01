import * as React from "react";
import { cn } from "./cn";

export const fieldBase =
  "w-full rounded-md border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/15";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export function Input({ className, startIcon, endAdornment, ...props }: InputProps) {
  if (!startIcon && !endAdornment) {
    return <input className={cn(fieldBase, "h-11", className)} {...props} />;
  }

  return (
    <div className="relative">
      {startIcon && <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-subtle [&_svg]:size-[18px]">{startIcon}</span>}
      <input className={cn(fieldBase, "h-11", startIcon && "ps-10", endAdornment && "pe-14", className)} {...props} />
      {endAdornment && <span className="absolute inset-y-0 end-3 flex items-center text-sm text-ink-subtle">{endAdornment}</span>}
    </div>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-3 leading-relaxed", className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, "h-11 appearance-none pe-10", className)} {...props}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ms-0.5 text-rose-600" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
