"use client";
import { Check, Warning, SealCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { DemoRecord } from "./DemoRecord";
import { cn } from "@/lib/cn";

export function ResultScreen({
  title,
  description,
  children,
  recorded,
  warning = false,
  tone = "brand",
  action,
  actionIcon,
  onAction,
  fullScreen = false,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  recorded?: string;
  warning?: boolean;
  /** The stamp colour the board draws: the brand yellow, or a soft warning or done tint. */
  tone?: "brand" | "soft" | "danger" | "success";
  action: string;
  /** Replaces the arrow in the button's circle, for example the scanner. */
  actionIcon?: React.ReactNode;
  onAction: () => void;
  fullScreen?: boolean;
}) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-460 flex-col items-center justify-center gap-20 py-40 text-center",
        fullScreen ? "min-h-dvh" : "min-h-[70dvh]",
      )}
    >
      <span
        className={cn(
          "grid size-88 place-items-center rounded-full",
          tone === "danger"
            ? "bg-ds-danger-soft text-ds-danger"
            : tone === "success"
              ? "bg-ds-success-soft text-ds-success"
              : tone === "soft"
                ? "bg-ds-brand-soft text-ds-brand-deep"
                : "bg-ds-brand text-ds-ink",
        )}
      >
        {warning ? (
          <Warning size={36} />
        ) : tone === "success" ? (
          <SealCheck size={36} />
        ) : (
          <Check size={36} />
        )}
      </span>
      <h1 className="text-title">{title}</h1>
      {children}
      <p className="text-body text-ds-muted">{description}</p>
      <div className="mt-8 flex w-full max-w-380 flex-col gap-12">
        {recorded && <DemoRecord title={recorded} />}
        <Button icon={actionIcon} className="w-full justify-between" onClick={onAction}>
          {action}
        </Button>
      </div>
    </section>
  );
}
