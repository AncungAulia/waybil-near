/*
 * The pickup point of a shipment being approved, kept in this tab until its trip is saved.
 * The contract records the destination but not the pickup, so this note bridges the few
 * seconds between the wallet and the first read of the new shipment.
 */
const KEY = "waybil:pending-trip";

export interface PendingTrip {
  pickupId: string;
  driver: string;
  destination: number;
  /** The newest shipment id before this one. */
  after: number;
}

export function rememberPickup(note: PendingTrip) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(note));
  } catch {
    /* Storage can be off. The shipment page then asks for the pickup point. */
  }
}

export function forgetPickup() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Nothing to clear. */
  }
}

/** The pickup point noted for this shipment, if the note matches it. */
export function pickupFor(shipment: { id: number; driver: string; destination: number }) {
  try {
    const note = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as PendingTrip | null;
    if (
      note &&
      shipment.id > note.after &&
      shipment.driver === note.driver &&
      shipment.destination === note.destination
    )
      return note.pickupId;
  } catch {
    /* A broken note is ignored. */
  }
  return null;
}
