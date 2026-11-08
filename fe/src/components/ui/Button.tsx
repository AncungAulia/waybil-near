"use client";

import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight, ArrowLineDown, Check, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/*
 * Buttons from design/waybil.pen, "1 · Foundations" → Section Buttons and the States board.
 * All five are 48 px tall pills with a 15/500 label. Primary, secondary and moment carry a
 * 36 px circle on the right; quiet and icon do not.
 * Tailwind 4 already limits `hover:` to devices that really hover, so no extra guard here.
 */

type Variant = "primary" | "secondary" | "moment" | "quiet";

const SHELL = "press focus-ring inline-flex h-48 items-center rounded-full text-body font-medium";

const VARIANT: Record<Variant, string> = {
  primary: cn(
    "gap-12 py-6 pr-6 pl-22 bg-ds-ink text-ds-bg",
    "active:bg-black/92",
    "disabled:bg-ds-surface-3 disabled:text-ds-off-ink",
  ),
  secondary: cn(
    "gap-12 py-6 pr-6 pl-22 bg-ds-bg text-ds-ink border border-ds-line-strong",
    "active:bg-ds-surface-3",
    "disabled:bg-ds-bg disabled:text-ds-off-ink disabled:border-ds-line",
  ),
  moment: cn(
    "gap-12 py-6 pr-6 pl-22 bg-ds-brand text-ds-ink",
    "active:bg-ds-brand-pressed",
    "disabled:bg-ds-brand-soft disabled:text-ds-off-brand-ink",
  ),
  quiet: cn(
    "gap-8 px-18 bg-ds-canvas text-ds-ink",
    "hover:bg-ds-surface-3",
    "disabled:bg-ds-canvas disabled:text-ds-off-ink",
  ),
};

/** The circle's own colours per variant: resting, hovered, and while the button is off. */
const CIRCLE: Record<Exclude<Variant, "quiet">, string> = {
  primary: cn(
    "bg-ds-bg text-ds-ink",
    "group-hover:bg-ds-brand",
    "group-disabled:bg-ds-off-circle group-disabled:text-ds-off-ink",
  ),
  secondary: cn(
    "bg-ds-ink text-ds-bg",
    "group-hover:bg-ds-brand group-hover:text-ds-ink",
    "group-disabled:bg-ds-line-strong group-disabled:text-ds-bg",
  ),
  moment: cn(
    "bg-ds-ink text-ds-bg",
    "group-hover:bg-ds-bg group-hover:text-ds-ink",
    "group-disabled:bg-ds-off-brand-circle group-disabled:text-ds-bg",
  ),
};

export interface ButtonProps extends Omit<ComponentProps<"button">, "children"> {
  variant?: Variant;
  children: ReactNode;
  /** Shows the spinner and the waiting label. The button stops responding. */
  loading?: boolean;
  /** What the label says while waiting, for example "Sending". */
  loadingLabel?: ReactNode;
  /** Moment buttons only: a green check and the result, held before the next screen. */
  success?: boolean;
  /** What the label says once it worked, for example "Cashed out". */
  successLabel?: ReactNode;
}

export function Button({
  variant = "primary",
  children,
  loading = false,
  loadingLabel,
  success = false,
  successLabel,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const label = loading
    ? (loadingLabel ?? children)
    : success
      ? (successLabel ?? children)
      : children;
  const state = loading ? "loading" : success ? "success" : "rest";

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("group", SHELL, VARIANT[variant], className)}
    >
      {/*
       * The resting label stays in the flow but invisible, so the pill keeps its width when
       * the label swaps to "Sending" and the circle never jumps sideways.
       */}
      <span className="grid place-items-center">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {children}
        </span>
        <span key={state} className="swap col-start-1 row-start-1 whitespace-nowrap">
          {label}
        </span>
      </span>

      {variant !== "quiet" && (
        <ButtonCircle variant={variant} loading={loading} success={success} />
      )}
    </button>
  );
}

function ButtonCircle({
  variant,
  loading,
  success,
}: {
  variant: Exclude<Variant, "quiet">;
  loading: boolean;
  success: boolean;
}) {
  return (
    <span
      className={cn(
        "grid size-36 shrink-0 place-items-center rounded-full transition-colors duration-150 ease-base",
        success ? "bg-ds-success text-ds-bg" : CIRCLE[variant],
      )}
    >
      {loading ? (
        <CircleNotch size={17} className="animate-spin motion-reduce:animate-none" />
      ) : success ? (
        <Check size={17} weight="bold" />
      ) : variant === "moment" ? (
        <ArrowLineDown size={17} />
      ) : (
        /* The arrow turns from up-right to right on hover, it is not swapped for another icon. */
        <ArrowUpRight
          size={17}
          className="transition-transform duration-150 ease-base group-hover:rotate-45 motion-reduce:transition-none"
        />
      )}
    </span>
  );
}

export interface IconButtonProps extends ComponentProps<"button"> {
  /** Always needed: an icon on its own tells a screen reader nothing. */
  label: string;
}

/** The square icon button. Same height as the others, always with a spoken label. */
export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={cn(
        "press focus-ring grid size-48 place-items-center rounded-full border border-ds-line-strong text-ds-ink",
        "hover:bg-ds-canvas",
        "disabled:text-ds-off-icon",
        className,
      )}
    >
      {children}
    </button>
  );
}
