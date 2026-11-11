"use client";

import { useMemo, useSyncExternalStore } from "react";
import { LIVE } from "./env";

/*
 * Read-only view of the shipments the shipper cancelled in the demo. The shipper module
 * writes both keys: the list of cancelled ids, and when each one was cancelled (ms).
 * Other roles only read them, so a cancel in one tab shows up in the driver's tab too.
 */
const CANCELLED_KEY = "waybil-demo-cancelled-v1";
const CANCELLED_AT_KEY = "waybil-demo-cancelled-at-v1";
/** Only #1044 and shipments created in the demo can be cancelled (status Approved only). */
const CANCELLABLE = (id: number) => id === 1044 || id >= 1045;
/** The demo runs on a fixed day, Nov 12, the same one the shipper screens use. Live uses today. */
const DEMO_DAY = LIVE ? Date.now() : Date.parse("2026-11-12");

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Cancelled shipment ids mapped to when they were cancelled, or null when the time is unknown. */
export function parseDemoCancelled(idsJson: string, timesJson: string): Map<number, number | null> {
  const result = new Map<number, number | null>();
  let ids: unknown;
  let times: unknown;
  try {
    ids = JSON.parse(idsJson);
  } catch {
    return result;
  }
  try {
    times = JSON.parse(timesJson);
  } catch {
    times = {};
  }
  if (!Array.isArray(ids)) return result;
  const at = times && typeof times === "object" ? (times as Record<string, unknown>) : {};
  for (const id of ids) {
    if (typeof id !== "number" || !Number.isSafeInteger(id) || !CANCELLABLE(id)) continue;
    const ms = at[String(id)];
    result.set(id, typeof ms === "number" && Number.isFinite(ms) ? ms : null);
  }
  return result;
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  /* The shipper module fires this in the same tab after a cancel. */
  window.addEventListener("waybil-demo-delivery", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("waybil-demo-delivery", notify);
  };
}
const snapshot = () => `${read(CANCELLED_KEY)}\n${read(CANCELLED_AT_KEY)}`;
const SERVER = "\n";

/** Every cancelled demo shipment. Empty on the server and on first render. */
export function useDemoCancelled() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  return useMemo(() => {
    const [ids = "", times = ""] = raw.split("\n");
    return parseDemoCancelled(ids, times);
  }, [raw]);
}

/**
 * "Nov 12 at 09:40". The demo keeps its fixed day and takes the clock time in the given
 * time zone, the browser's by default, so only call it without one after mount.
 */
export function cancelMoment(ms: number, timeZone?: string) {
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(DEMO_DAY));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(new Date(ms));
  return `${day} at ${time}`;
}
