"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowLineDown, Check, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";

/*
 * Buttons from design/waybil.pen, "1 · Foundations" → Section Buttons and the States board.
 * All five are 48 px tall pills with a 15/500 label. Primary, secondary and moment carry a
 * 36 px circle on the right; quiet and icon do not.
 * `hover:` and `group-hover:` only apply to fine pointers, because globals.css redefines the
 * `hover` variant as `(hover: hover) and (pointer: fine)`. No extra guard is needed here.
 */

type Variant = "primary" | "secondary" | "moment" | "danger" | "quiet";

/*
 * The circle sits at the far right whenever the pill is wider than its label, which is what
 * the board draws. On a pill that hugs its label there is no free space, so nothing moves.
 */
const SHELL =
  "press focus-ring inline-flex h-48 items-center justify-between rounded-full text-body font-medium";

const VARIANT: Record<Variant, string> = {
  primary: cn(
    "gap-12 py-6 pr-6 pl-22 bg-ds-ink text-ds-bg",
    "active:bg-ds-ink/92",
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
  danger: cn(
    "gap-12 py-6 pr-6 pl-22 bg-ds-danger text-ds-bg",
    "active:bg-ds-danger/92",
    "disabled:bg-ds-danger-soft disabled:text-ds-off-ink",
  ),
  quiet: cn(
    "gap-8 px-18 bg-ds-canvas text-ds-ink",
    "hover:bg-ds-canvas-hover",
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
  danger: cn(
    "bg-ds-bg text-ds-danger",
    "group-hover:bg-ds-ink group-hover:text-ds-bg",
    "group-disabled:bg-ds-off-circle group-disabled:text-ds-off-ink",
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
  /** Replaces the arrow in the circle where the board draws another icon, for example a plus. */
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  children,
  loading = false,
  loadingLabel,
  success = false,
  successLabel,
  icon,
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
  /* The label only crossfades when it really swaps, never on first load. */
  const swapped = useChanged(state);

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      /*
       * While it waits the button keeps its colours, as the board draws it, and only stops
       * responding. `disabled` is kept for the buttons that are really off, and those grey out.
       * Enter, Space and a form's implicit submit still fire a click on a submit button, so
       * the click is cancelled here too, which also stops the form from being sent twice.
       */
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={
        loading
          ? (event) => {
              event.preventDefault();
            }
          : rest.onClick
      }
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
        <span
          key={state}
          className={cn("col-start-1 row-start-1 whitespace-nowrap", swapped && "swap")}
        >
          {label}
        </span>
      </span>

      {variant !== "quiet" && (
        <ButtonCircle variant={variant} loading={loading} success={success} icon={icon} />
      )}
    </button>
  );
}

function ButtonCircle({
  variant,
  loading,
  success,
  icon,
}: {
  variant: Exclude<Variant, "quiet">;
  loading: boolean;
  success: boolean;
  icon?: ReactNode;
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
      ) : icon ? (
        icon
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

export interface ButtonLinkProps extends Omit<ComponentProps<"a">, "children"> {
  variant?: Exclude<Variant, "quiet">;
  children: ReactNode;
  /** Replaces the arrow in the circle, for example the Google Maps needle. */
  icon?: ReactNode;
}

/** The same pill as Button, for the links that leave the app. */
export function ButtonLink({
  variant = "primary",
  children,
  icon,
  className,
  ...rest
}: ButtonLinkProps) {
  const inner = (
    <>
      <span className="whitespace-nowrap">{children}</span>
      <ButtonCircle variant={variant} loading={false} success={false} icon={icon} />
    </>
  );
  const classes = cn("group", SHELL, VARIANT[variant], className);
  /* A route inside the app moves without reloading the page. Other addresses stay plain links. */
  if (typeof rest.href === "string" && rest.href.startsWith("/"))
    return (
      <Link {...rest} href={rest.href} className={classes}>
        {inner}
      </Link>
    );
  return (
    <a {...rest} className={classes}>
      {inner}
    </a>
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
