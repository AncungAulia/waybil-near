"use client";
import { useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Marks the reads a write changed as stale, so the screens showing them read again. Each key
 * also matches every longer key that starts with it, for example `qk.allTrips()`.
 */
export function useInvalidate() {
  const client = useQueryClient();
  return useCallback(
    (...keys: QueryKey[]) =>
      Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))).then(() => {}),
    [client],
  );
}
