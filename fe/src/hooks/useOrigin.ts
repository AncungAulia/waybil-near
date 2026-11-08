"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
/** Resolve local preview links after hydration without embedding an undeployed hostname. */
export function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
}
