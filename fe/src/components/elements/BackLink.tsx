import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/*
 * The one way back on a screen. It always sits first, at the top-left of the card or page,
 * where people look for it, never under the main action. Pass `href` to go to a route or
 * `onClick` to step back inside a flow.
 */
const CLASSES =
  "tap focus-ring -ml-6 inline-flex w-fit items-center gap-6 rounded-full px-6 py-6 text-label font-medium text-ds-muted hover:text-ds-ink disabled:opacity-50";

export function BackLink({
  children,
  href,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <ArrowLeft size={16} aria-hidden />
      {children}
    </>
  );
  if (href)
    return (
      <Link href={href} className={cn(CLASSES, className)}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(CLASSES, className)}>
      {inner}
    </button>
  );
}
