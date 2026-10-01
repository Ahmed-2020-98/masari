import * as React from "react";
import { cn } from "./cn";

/** Ribbon "M" mark cropped from the official logo (served from each app's /public/brand). */
export function LogoMark({ className, title = "مساري" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.webp" alt={title} width={320} height={258} className={cn("h-9 w-auto select-none", className)} draggable={false} />;
}

/**
 * Full lockup: mark + «مساري» + MASARI. `tone="dark"` renders the wordmark in white for navy backgrounds.
 */
export function Logo({ tone = "light", size = "md", className, tagline }: { tone?: "light" | "dark"; size?: "sm" | "md" | "lg"; className?: string; tagline?: boolean }) {
  const sizes = {
    sm: { mark: "h-7", word: "text-xl", latin: "text-[8px] tracking-[0.5em]" },
    md: { mark: "h-9", word: "text-2xl", latin: "text-[9px] tracking-[0.55em]" },
    lg: { mark: "h-14", word: "text-4xl", latin: "text-[12px] tracking-[0.6em]" },
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="مساري Masari">
      <LogoMark className={sizes.mark} title="" />
      <span className="flex flex-col items-center leading-none" aria-hidden>
        <span className={cn("font-extrabold", sizes.word, tone === "dark" ? "text-white" : "text-navy-900 dark:text-white")}>مساري</span>
        <span className={cn("num mt-1 ps-[0.5em] font-medium", sizes.latin, tone === "dark" ? "text-white/70" : "text-navy-900/70 dark:text-white/70")}>MASARI</span>
        {tagline && <span className={cn("mt-1.5 text-[11px]", tone === "dark" ? "text-white/60" : "text-ink-subtle")}>كل شحناتك في مكان واحد</span>}
      </span>
    </span>
  );
}

/**
 * Brand pattern: a row of outlined ribbon-Ms fading in, ending in a solid gradient M.
 */
export function BrandPattern({ className, count = 5, animated = true }: { className?: string; count?: number; animated?: boolean }) {
  const id = React.useId();
  const width = 84;

  return (
    <svg viewBox={`0 0 ${width * count} 72`} className={cn("h-auto w-full", className)} fill="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00C48C" />
          <stop offset="60%" stopColor="#0B6E7A" />
          <stop offset="100%" stopColor="#0F2741" />
        </linearGradient>
      </defs>
      {Array.from({ length: count }).map((_, index) => {
        const last = index === count - 1;
        const x = index * width;
        const d = `M${x + 8} 62 V18 Q${x + 8} 8 ${x + 17} 13 L${x + 42} 34 L${x + 67} 13 Q${x + 76} 8 ${x + 76} 18 V62`;

        return (
          <path
            key={index}
            d={d}
            pathLength={1}
            stroke={last ? `url(#${id}-g)` : "currentColor"}
            strokeWidth={last ? 13 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={animated ? 1 : undefined}
            className={animated ? "animate-draw" : undefined}
            style={{ opacity: last ? 1 : 0.15 + (index / count) * 0.45, animationDelay: animated ? `${index * 140}ms` : undefined }}
          />
        );
      })}
    </svg>
  );
}
