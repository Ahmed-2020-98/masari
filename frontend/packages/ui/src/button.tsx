import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-bold transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-green-500 text-navy-900 shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] hover:bg-green-400",
        navy: "bg-navy-900 text-white hover:bg-navy-800 dark:bg-green-500 dark:text-navy-900",
        outline: "border border-line-strong bg-surface text-ink hover:border-navy-900 hover:bg-surface-muted",
        ghost: "text-ink hover:bg-navy-50 dark:hover:bg-navy-800",
        soft: "bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200",
        danger: "bg-rose-600 text-white hover:bg-rose-700",
        "danger-soft": "bg-rose-50 text-rose-700 hover:bg-rose-100",
        link: "h-auto px-0 text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
