import type { ShipmentDraft } from "./form";

/*
 * The draft is kept for this tab, so "Invite a new driver" and "See your credit" can leave
 * the form and come back to it. It is cleared once the shipment is approved.
 */
const DRAFT_KEY = "waybil-shipper-draft-v1";
const DRAFT_FIELDS = ["driver", "destination", "cargo", "fee", "due"] as const;
export function readDraft(): ShipmentDraft | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (!value || typeof value !== "object") return undefined;
    const draft = value as Record<string, unknown>;
    return DRAFT_FIELDS.every((key) => typeof draft[key] === "string")
      ? (draft as unknown as ShipmentDraft)
      : undefined;
  } catch {
    return undefined;
  }
}
export function saveDraft(draft: ShipmentDraft | undefined) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* Without storage the draft only lives on this screen. */
  }
}
