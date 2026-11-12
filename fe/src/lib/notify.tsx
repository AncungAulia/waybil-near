"use client";
import { toast } from "sonner";
import { TxToast } from "@/components/elements/TxToast";

/*
 * App toasts: Sonner places, stacks and swipes them, and TxToast draws them as the design's
 * dark card (design/waybil.pen, Toast/Tx). Use them for routine results the screen already
 * shows. Money moved or a milestone gets a dialog instead, and field errors stay inline.
 *
 * - success: 5 seconds, with the NearBlocks record when there is one.
 * - error: 10 seconds, so it can be read.
 * - sending: stays until the same id is updated with success or error.
 */
type Note = { meta?: string; tx?: string; id?: string | number };

function show(state: "sending" | "confirmed" | "failed", title: string, note: Note, ms: number) {
  return toast.custom(
    () => <TxToast state={state} title={title} meta={note.meta ?? ""} tx={note.tx} />,
    { id: note.id, duration: ms },
  );
}

export const notify = {
  success: (title: string, note: Note = {}) => show("confirmed", title, note, 5_000),
  error: (title: string, note: Note = {}) => show("failed", title, note, 10_000),
  /** Returns the id to pass to success or error once the transaction settles. */
  sending: (title: string, note: Note = {}) => show("sending", title, note, Infinity),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
