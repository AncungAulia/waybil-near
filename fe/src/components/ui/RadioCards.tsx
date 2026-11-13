"use client";
import { cn } from "@/lib/cn";

/**
 * A short list of choices as cards with a round radio, a bold title and one line under it.
 * The chosen card turns soft yellow with an ink border, the same as the settle sheet.
 */
export function RadioCards<T extends string>({
  name,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  options: { value: T; title: string; body: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-10 sm:grid-cols-2", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "tap flex cursor-pointer items-start gap-12 rounded-[16px] border-[1.5px] p-16",
              on ? "border-ds-ink bg-ds-brand-soft" : "border-transparent bg-ds-canvas",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={on}
              className="peer sr-only"
              onChange={() => onChange(o.value)}
            />
            <span
              aria-hidden
              className={cn(
                "mt-1 grid size-20 shrink-0 place-items-center rounded-full border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ds-ink",
                on ? "border-ds-ink bg-ds-ink" : "border-ds-line-strong bg-ds-bg",
              )}
            >
              {on && <span className="size-8 rounded-full bg-ds-brand" />}
            </span>
            <span>
              <span className="block text-[15px] leading-[1.2] font-semibold">{o.title}</span>
              <span className="mt-3 block text-[13px] leading-[1.3] text-ds-ink-2">{o.body}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
