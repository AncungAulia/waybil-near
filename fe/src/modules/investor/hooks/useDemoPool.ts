"use client";
import { useSyncExternalStore } from "react";
import { INITIAL_BALANCE, type DemoPoolBalance } from "../data/demo";

const KEY = "waybil-demo-pool-v1";

function read() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("waybil-demo-pool", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("waybil-demo-pool", fn);
  };
}
function balanceFromJson(json: string): DemoPoolBalance {
  try {
    const b = JSON.parse(json) as DemoPoolBalance;
    if (
      Object.values(b).length === 5 &&
      Object.values(b).every((v) => typeof v === "string" && /^\d+$/.test(v))
    )
      return b;
  } catch {
    /* Invalid demo input falls back to a disabled action or fixture. */
  }
  return INITIAL_BALANCE;
}

/* The local demo balance, kept in browser storage and shared across tabs. */
export function useDemoPool() {
  const snapshot = useSyncExternalStore(subscribe, read, () => "");
  return balanceFromJson(snapshot);
}

export function saveDemoPool(balance: DemoPoolBalance) {
  localStorage.setItem(KEY, JSON.stringify(balance));
  window.dispatchEvent(new Event("waybil-demo-pool"));
}
