"use client";
import { Check, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { DemoRecord } from "./DemoRecord";
import { cn } from "@/lib/cn";

export function ResultScreen({
  title,
  description,
  children,
  recorded,
  warning = false,
  action,
  onAction,
  fullScreen = false,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  recorded?: string;
  warning?: boolean;
  action: string;
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
          warning ? "bg-ds-brand-soft text-ds-warning" : "bg-ds-brand text-ds-ink",
        )}
      >
        {warning ? <Warning size={36} /> : <Check size={36} />}
      </span>
      <h1 className="text-title">{title}</h1>
      {children}
      <p className="text-body text-ds-muted">{description}</p>
      <div className="mt-8 flex w-full max-w-380 flex-col gap-12">
        {recorded && <DemoRecord title={recorded} />}
        <Button className="w-full justify-between" onClick={onAction}>
          {action}
        </Button>
      </div>
    </section>
  );
}
