"use client";
import { useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/*
 * Chain reads use "final" blocks, which trail a new transaction by a second or two. A read
 * right after a write can still see the old state, so the same reads run again shortly after.
 */
const SETTLE_MS = [2_500, 6_000];

/**
 * Marks the reads a write changed as stale, so the screens showing them read again now and
 * twice more over the next few seconds, until the chain shows the change. Each key also
 * matches every longer key that starts with it, for example `qk.allTrips()`.
 */
export function useInvalidate() {
  const client = useQueryClient();
  return useCallback(
    (...keys: QueryKey[]) => {
      const run = () =>
        Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))).then(() => {});
      for (const ms of SETTLE_MS) window.setTimeout(() => void run(), ms);
      return run();
    },
    [client],
  );
}
