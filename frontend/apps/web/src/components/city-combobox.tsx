"use client";

import type { Region } from "@masari/api";
import { cn, fieldBase, Popover, PopoverAnchor, PopoverContent } from "@masari/ui";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/^ال/, "").trim();

/** Searchable city picker grouped by region (keyboard accessible combobox). */
export function CityCombobox({
  regions,
  value,
  onChange,
  placeholder = "اختر المدينة",
  id,
  invalid,
  className,
}: {
  regions: Region[];
  value: number | null | undefined;
  onChange: (cityId: number) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => regions.flatMap((region) => region.cities).find((city) => city.id === value), [regions, value]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return regions
      .map((region) => ({ ...region, cities: region.cities.filter((city) => !needle || normalize(city.name).includes(needle) || city.name_en.toLowerCase().includes(needle)) }))
      .filter((region) => region.cities.length > 0);
  }, [regions, query]);

  const flat = filtered.flatMap((region) => region.cities);

  const choose = (cityId: number) => {
    onChange(cityId);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <MapPin className="pointer-events-none absolute start-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            aria-activedescendant={open && flat[active] ? `${listId}-${flat[active].id}` : undefined}
            className={cn(fieldBase, "h-11 ps-10 pe-9")}
            placeholder={selected ? selected.name : placeholder}
            value={open ? query : selected?.name ?? ""}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActive((index) => Math.min(index + 1, flat.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && open && flat[active]) {
                event.preventDefault();
                choose(flat[active].id);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            autoComplete="off"
          />
          <ChevronsUpDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1.5 scrollbar-thin"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === inputRef.current) event.preventDefault();
        }}
      >
        <ul id={listId} role="listbox" aria-label="المدن">
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-subtle">لا توجد مدينة بهذا الاسم</li>}
          {filtered.map((region) => (
            <li key={region.id} role="presentation">
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold text-ink-subtle">{region.name}</p>
              <ul role="presentation">
                {region.cities.map((city) => {
                  const index = flat.indexOf(city);
                  return (
                    <li
                      key={city.id}
                      id={`${listId}-${city.id}`}
                      role="option"
                      aria-selected={city.id === value}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(city.id)}
                      onMouseEnter={() => setActive(index)}
                      className={cn("flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-2 text-sm", index === active && "bg-surface-muted", city.id === value && "font-bold")}
                    >
                      <span>
                        {city.name}
                        {city.is_remote && <span className="ms-2 text-[11px] text-amber-700">منطقة نائية</span>}
                      </span>
                      {city.id === value && <Check className="size-4 text-green-600" aria-hidden />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
