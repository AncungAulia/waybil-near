"use client";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CaretDown, CaretUpDown, Check, MagnifyingGlass } from "@phosphor-icons/react";

/*
 * A field that opens a searchable list (country code in C4, province in C5).
 * The search box is a combobox: typing filters, Arrow Up and Down move the highlighted
 * option, Home and End jump to the ends, Enter picks it, and Escape closes the list and
 * returns to the field. Focus stays in the search box while the list moves, as the
 * combobox pattern asks. Arrow Down or Up on the closed field opens it too.
 * With `allowCustom`, a search that matches no option can be picked as typed, so a place
 * missing from the list (or a list that failed to load) never blocks the form.
 */
/** Long lists (cities) draw this many matches. Typing narrows the rest. */
const MAX_SHOWN = 300;
type Option = { value: string; label: string; flag?: string; detail?: string };
/** A flag is an image path, or an emoji drawn from the ISO2 code when no image exists. */
function Flag({ flag }: { flag: string }) {
  return flag.startsWith("/") ? (
    <img
      src={flag}
      alt=""
      width={22}
      height={15}
      className="h-15 w-22 shrink-0 rounded-[3px] object-cover ring-1 ring-ds-ink/10"
    />
  ) : (
    <span aria-hidden className="w-22 shrink-0 text-center text-[17px] leading-none">
      {flag}
    </span>
  );
}
export function SearchPicker({
  label,
  className,
  value,
  options,
  onChange,
  placeholder = "Choose one",
  disabled = false,
  initialOpen = false,
  initialQuery = "",
  appearance,
  popoverAlign = "start",
  allowCustom = false,
  emptyText = "No matches.",
}: {
  label: string;
  className?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialOpen?: boolean;
  initialQuery?: string;
  appearance?: "company";
  popoverAlign?: "start" | "end";
  allowCustom?: boolean;
  /** Shown when the list has nothing to pick, for example while it loads. */
  emptyText?: string;
}) {
  const [open, setOpen] = useState(initialOpen),
    [query, setQuery] = useState(initialQuery),
    [active, setActive] = useState(-1),
    /* The highlight came from the keyboard, so it also gets a ring and scrolls into view. */
    [keyboard, setKeyboard] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  /* Set when the person opened the list, so the search box takes focus once it is drawn. */
  const focusSearch = useRef(false);
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-option-${i}`;
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (open && focusSearch.current) {
      focusSearch.current = false;
      input.current?.focus();
    }
  }, [open]);
  const needle = query.trim().toLowerCase();
  const matches = options.filter((o) =>
    `${o.label} ${o.value} ${o.detail ?? ""}`.toLowerCase().includes(needle),
  );
  const custom =
    allowCustom && needle && !options.some((o) => o.label.toLowerCase() === needle)
      ? [{ value: query.trim(), label: `Use “${query.trim()}”` }]
      : [];
  const filtered: Option[] = [...matches.slice(0, MAX_SHOWN), ...custom];
  const selected = options.find((o) => o.value === value);
  /* With nothing highlighted yet, the chosen option (or the first) is the starting point. */
  const current =
    active >= 0 && active < filtered.length
      ? active
      : Math.max(
          0,
          filtered.findIndex((o) => o.value === value),
        );
  useEffect(() => {
    if (!keyboard) return;
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current, keyboard]);
  const show = (next: boolean) => {
    setOpen(next);
    setQuery("");
    setActive(-1);
    setKeyboard(false);
    focusSearch.current = next;
  };
  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  };
  const move = (index: number) => {
    if (!filtered.length) return;
    setKeyboard(true);
    setActive((index + filtered.length) % filtered.length);
  };
  return (
    <div
      ref={ref}
      className={cn("relative flex flex-col gap-8", className)}
      onBlur={(e) => {
        /* Tab out of the list closes it, like a click outside. */
        if (open && !ref.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget)
          setOpen(false);
      }}
    >
      <span id={id} className="text-label font-medium">
        {label}
      </span>
      <button
        ref={trigger}
        aria-labelledby={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        className={cn(
          "press flex h-52 w-full items-center justify-between gap-8 rounded-row border border-transparent bg-ds-canvas px-18 text-left text-label disabled:text-ds-off-ink",
          appearance === "company"
            ? "focus-visible:border-ds-ink focus-visible:outline-none"
            : "focus-ring",
          appearance === "company" &&
            "rounded-[16px] border-[1.5px] border-ds-canvas px-16 text-[16px] font-normal",
          open && appearance === "company" && "border-ds-ink bg-ds-bg",
        )}
        onClick={() => show(!open)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
            e.preventDefault();
            show(true);
          }
        }}
      >
        <span className="flex min-w-0 items-center gap-8 truncate">
          {appearance === "company" && label === "Phone code" && selected?.flag && (
            <Flag flag={selected.flag} />
          )}
          {label === "Phone code"
            ? (selected?.detail ?? value)
            : (selected?.label ?? (value || placeholder))}
        </span>
        {appearance === "company" ? (
          <CaretUpDown size={16} className="shrink-0 text-ds-muted" />
        ) : (
          <CaretDown size={16} />
        )}
      </button>
      {open && (
        <div
          className={cn(
            `absolute top-full left-0 z-30 mt-4 rounded-row border border-ds-line bg-ds-bg p-8 shadow-lg ${label === "Phone code" ? "w-280 max-w-[calc(100vw-64px)] md:left-1/2 md:-translate-x-1/2" : "right-0"}`,
            appearance === "company" && "mt-8 rounded-[18px] border-ds-line-strong p-6",
            appearance === "company" &&
              label === "Phone code" &&
              "w-320 md:left-0 md:translate-x-0",
            popoverAlign === "end" && "md:right-0 md:left-auto",
          )}
          /* A press on the list keeps focus in the search box, so the list does not close. */
          onMouseDown={(e) => {
            if (e.target !== input.current) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          <div className={cn("relative", appearance === "company" && "mb-6")}>
            {appearance === "company" && (
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute top-12 left-12 text-ds-muted"
              />
            )}
            <input
              ref={input}
              role="combobox"
              aria-label={`Search ${label.toLowerCase()}`}
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 && filtered.length ? optionId(current) : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") move(active < 0 ? current : current + 1);
                else if (e.key === "ArrowUp") move(active < 0 ? current : current - 1);
                else if (e.key === "Home" && filtered.length) move(0);
                else if (e.key === "End" && filtered.length) move(-1);
                else if (e.key === "Enter" && filtered[current]) pick(filtered[current]!.value);
                else return;
                e.preventDefault();
              }}
              className={cn(
                "mb-8 h-40 w-full rounded-small border border-transparent bg-ds-canvas px-12 text-label focus:border-ds-ink focus-visible:outline-none",
                appearance === "company" && "mb-0 pl-36 text-[14.5px]",
              )}
              placeholder={
                label === "Phone code"
                  ? "Search country or code"
                  : `Search ${label === "State / Province" ? "provinces" : label.toLowerCase()}`
              }
            />
          </div>
          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-label={label}
            className={cn("max-h-220 overflow-y-auto", appearance === "company" && "max-h-300")}
          >
            {filtered.length ? (
              filtered.map((o, i) => (
                <div
                  key={o.value}
                  id={optionId(i)}
                  data-index={i}
                  role="option"
                  aria-selected={value === o.value}
                  className={cn(
                    "flex w-full items-center justify-between gap-8 rounded-small p-12 text-left text-label hover:bg-ds-canvas",
                    appearance === "company" && "text-[14.5px] font-normal",
                    ((appearance === "company" && value === o.value) ||
                      (active >= 0 && i === current)) &&
                      "bg-ds-canvas",
                    keyboard && i === current && "outline-1 -outline-offset-1 outline-ds-ink",
                  )}
                  onPointerMove={() => {
                    if (i !== active || keyboard) {
                      setKeyboard(false);
                      setActive(i);
                    }
                  }}
                  onClick={() => pick(o.value)}
                >
                  <span className="flex items-center gap-10">
                    {appearance === "company" && o.flag && <Flag flag={o.flag} />}
                    {o.label}
                  </span>
                  {appearance === "company" && label === "Phone code" && (
                    <span className="ml-auto text-[13.5px] text-ds-muted">
                      {o.detail ?? o.value}
                    </span>
                  )}
                  {value === o.value && <Check size={16} />}
                </div>
              ))
            ) : (
              <p className="p-12 text-label text-ds-muted">{needle ? "No matches." : emptyText}</p>
            )}
            {matches.length > MAX_SHOWN && (
              <p className="p-12 text-[13px] text-ds-muted">Keep typing to see more places.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
