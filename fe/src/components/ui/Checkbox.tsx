"use client";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/**
 * A checkbox drawn to match the design: a 22 px rounded box, white with a grey border, ink
 * with a white tick once checked. The real input stays in the page for keyboards and screen
 * readers, and the focus ring shows only for the keyboard.
 */
export function Checkbox({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-12 text-label", className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          "grid size-22 shrink-0 place-items-center rounded-[7px] border-[1.5px] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ds-ink",
          checked ? "border-ds-ink bg-ds-ink text-ds-bg" : "border-ds-line-strong bg-ds-bg",
        )}
      >
        {checked && <Check size={14} weight="bold" />}
      </span>
      <span>{children}</span>
    </label>
  );
}
