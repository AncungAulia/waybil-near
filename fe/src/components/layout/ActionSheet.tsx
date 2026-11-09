"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function ActionSheet({
  title,
  children,
  onClose,
  wide = false,
  stamp,
  stampTone = "soft",
  className,
  appearance,
  hideHeader = false,
  overlayClassName,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  preview?: boolean;
  wide?: boolean;
  /** An icon for a permission ask or a result. It centres the sheet and drops the close button. */
  stamp?: React.ReactNode;
  /** The stamp colour: the soft tint of a permission ask, or the brand yellow of a result. */
  stampTone?: "soft" | "brand" | "error";
  className?: string;
  appearance?: "wallet";
  hideHeader?: boolean;
  overlayClassName?: string;
}) {
  const start = useRef<{ y: number; time: number } | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const [openedWithKeyboard] = useState(
    () => typeof document !== "undefined" && !!document.activeElement?.matches(":focus-visible"),
  );
  const contents = hideHeader ? (
    <>
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      {children}
    </>
  ) : stamp ? (
    <>
      <span
        className={cn(
          "grid size-80 place-items-center rounded-full",
          stampTone === "brand"
            ? "bg-ds-brand text-ds-ink"
            : stampTone === "error"
              ? "bg-ds-danger-stamp text-ds-brand-deep"
              : "bg-ds-brand-soft text-ds-brand-deep",
        )}
      >
        {stamp}
      </span>
      <Dialog.Title
        className={cn("text-heading", appearance === "wallet" && "text-[24px] leading-[1.2]")}
      >
        {title}
      </Dialog.Title>
      {children}
    </>
  ) : (
    <>
      <div className="flex items-center justify-between gap-16">
        <Dialog.Title className="text-heading">{title}</Dialog.Title>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "press grid size-40 place-items-center rounded-full bg-ds-canvas",
            appearance === "wallet" ? "focus-visible:outline-ds-ink" : "focus-ring",
            appearance === "wallet" && "size-24 bg-transparent text-ds-muted",
          )}
        >
          <X size={appearance === "wallet" ? 20 : 18} />
        </button>
      </div>
      {children}
    </>
  );
  const classes = cn(
    "flex flex-col gap-20 rounded-t-card bg-ds-bg p-24 md:rounded-card",
    appearance === "wallet" &&
      "gap-16 rounded-t-[32px] px-20 pt-12 pb-[calc(28px+env(safe-area-inset-bottom))] md:rounded-card md:p-28",
    stamp && "items-center gap-14 text-center",
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn("fixed inset-0 z-40 bg-ds-ink/35", overlayClassName)} />
        <Dialog.Content
          ref={content}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            if (appearance === "wallet" && !openedWithKeyboard) {
              event.preventDefault();
              content.current?.focus();
            }
          }}
          aria-describedby={undefined}
          className={cn(
            classes,
            "action-sheet fixed right-0 bottom-0 left-0 z-50 max-h-[90dvh] overflow-y-auto md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
            wide ? "md:w-560" : "md:w-480",
            className,
            appearance === "wallet" && "focus-visible:outline-none",
          )}
          style={{
            ...(drag ? { transform: `translateY(${drag}px)` } : {}),
            ...(openedWithKeyboard ? { animation: "none" } : {}),
          }}
        >
          <div
            aria-hidden
            className="mx-auto h-20 w-80 touch-none md:hidden"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = { y: e.clientY, time: performance.now() };
            }}
            onPointerMove={(e) => {
              if (start.current) {
                const delta = e.clientY - start.current.y;
                setDrag(delta > 0 ? delta : delta * 0.15);
              }
            }}
            onPointerUp={() => {
              const s = start.current;
              if (s && (drag > 100 || (drag > 15 && drag / (performance.now() - s.time) > 0.11)))
                onClose();
              start.current = null;
              setDrag(0);
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag(0);
            }}
          >
            <div className="mx-auto mt-4 h-4 w-40 rounded-full bg-ds-line-strong" />
          </div>
          {contents}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
