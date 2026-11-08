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
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  preview?: boolean;
  wide?: boolean;
}) {
  const start = useRef<{ y: number; time: number } | null>(null);
  const [drag, setDrag] = useState(0);
  const [openedWithKeyboard] = useState(
    () => typeof document !== "undefined" && !!document.activeElement?.matches(":focus-visible"),
  );
  const contents = (
    <>
      <div className="flex items-center justify-between gap-16">
        <Dialog.Title className="text-heading">{title}</Dialog.Title>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="press focus-ring grid size-40 place-items-center rounded-full bg-ds-canvas"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </>
  );
  const classes = "flex flex-col gap-20 rounded-t-card bg-ds-bg p-24 md:rounded-card";
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ds-ink/35" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            classes,
            "action-sheet fixed right-0 bottom-0 left-0 z-50 max-h-[90dvh] overflow-y-auto md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
            wide ? "md:w-560" : "md:w-480",
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
