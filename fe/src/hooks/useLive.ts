"use client";
import { useCallback } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";

/**
 * Loads live data for a query key and keeps it in the shared cache (providers/QueryProvider),
 * so returning to a page shows it at once and reads it again in the background. With
 * `pollMs` it also reads again on that interval while the tab is in view, so a status changed
 * by someone else shows up. Pass a null key to stay idle.
 *
 * The key must name what is read and whose it is, for example `qk.driverTrips(account)`.
 */
export function useLive<T>(load: () => Promise<T>, key: QueryKey | null, pollMs = 0) {
  const query = useQuery({
    queryKey: key ?? ["idle"],
    queryFn: load,
    enabled: key !== null,
    refetchInterval: pollMs > 0 ? pollMs : false,
  });
  const { refetch } = query;
  const reload = useCallback(() => void refetch(), [refetch]);
  return {
    data: key ? query.data : undefined,
    /* A failed background read keeps what is on screen. Only a first load can fail. */
    failed: !!key && query.isError && query.data === undefined,
    reload,
  };
}
