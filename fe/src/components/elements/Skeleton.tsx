import type { ReactNode } from "react";
import { Panel } from "@/components/layout/Panel";
import { cn } from "@/lib/cn";

/*
 * Loading shapes for the live screens. Each block shimmers slowly (`.skeleton` in
 * globals.css) and stands in for the text, number or icon it will become, so the page keeps
 * its size when the data arrives. Reduced motion keeps the blocks still.
 */

/** One shimmering block. Size and shape come from `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("skeleton block h-12 shrink-0 rounded-full bg-ds-surface-3", className)}
    />
  );
}

/** Holds a group of skeletons and tells screen readers what is loading. */
export function SkeletonGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A page title and the short line under it. */
export function SkeletonHeader({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-12 py-4", className)}>
      <Skeleton className="h-24 w-200 max-w-full" />
      <Skeleton className="w-280 max-w-full" />
    </div>
  );
}

/** A list row: an icon circle, two lines and an amount on the right. */
export function SkeletonRow({
  trailing = true,
  className,
}: {
  trailing?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex items-center gap-12 py-14", className)}>
      <Skeleton className="size-40" />
      <span className="flex min-w-0 flex-1 flex-col gap-8">
        <Skeleton className="w-180 max-w-full" />
        <Skeleton className="h-10 w-260 max-w-full" />
      </span>
      {trailing && <Skeleton className="w-72" />}
    </div>
  );
}

/** A number card: label, big number and a line of context, the size of a Stat. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-6 rounded-[22px] bg-ds-bg p-20", className)}>
      <span className="flex h-18 items-center">
        <Skeleton className="w-96" />
      </span>
      <span className="flex h-39 items-center">
        <Skeleton className="h-24 w-140" />
      </span>
      <span className="flex h-16 items-center">
        <Skeleton className="h-10 w-120" />
      </span>
    </div>
  );
}

/** Three number cards side by side, as the home screens draw them. */
export function SkeletonStats() {
  return (
    <div className="grid gap-16 md:grid-cols-3">
      <SkeletonStat />
      <SkeletonStat />
      <SkeletonStat />
    </div>
  );
}

/** A card with a title and a few list rows. */
export function SkeletonListPanel({
  rows = 4,
  title = true,
  className,
}: {
  rows?: number;
  title?: boolean;
  className?: string;
}) {
  return (
    <Panel gap={4} className={className}>
      {title && <Skeleton className="mb-8 h-16 w-140" />}
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </Panel>
  );
}

/**
 * A trip or shipment page while it loads: the title, a large map on the left and a column of
 * cards on the right, the same shape as the page that follows.
 */
export function SkeletonTripPage({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} className="flex flex-col gap-24">
      <SkeletonHeader />
      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-24">
        <Skeleton className="h-300 w-full rounded-card lg:h-auto lg:min-h-560" />
        <div className="flex flex-col gap-16">
          <Skeleton className="h-180 w-full rounded-card" />
          <Skeleton className="h-220 w-full rounded-card" />
          <Skeleton className="h-200 w-full rounded-card" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
