"use client";
import { useCallback } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { ProfilesResponse } from "@waybil/shared";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

/*
 * Shipments on chain only hold account ids. This turns them into the names people set: the
 * company for a shipper, the person's name for everyone else (GET /v1/profiles). Each name
 * sits in the shared cache under `qk.names(id)` for the whole visit, so each account is asked
 * for once. An account with no name, or one the API can't answer for, shows its id and is
 * asked again every 10 seconds while the screen is open, so a driver who adds their name
 * during the visit shows up by name.
 */
const RETRY_MS = 10_000;
const BATCH = 50;

/* Ids asked for in the same moment go out together, at most 50 to a request. */
let waiting = new Map<string, ((name: string | null) => void)[]>();
let failing = new Map<string, ((error: unknown) => void)[]>();
let scheduled = false;

function flush() {
  scheduled = false;
  const resolvers = waiting;
  const rejecters = failing;
  waiting = new Map();
  failing = new Map();
  const ids = [...resolvers.keys()];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    api<ProfilesResponse>(`/profiles?ids=${batch.map(encodeURIComponent).join(",")}`).then(
      ({ profiles }) => {
        const names = new Map(profiles.map((p) => [p.accountId, p.name || null]));
        for (const id of batch) resolvers.get(id)?.forEach((done) => done(names.get(id) ?? null));
      },
      (error: unknown) => {
        for (const id of batch) rejecters.get(id)?.forEach((fail) => fail(error));
      },
    );
  }
}

function askName(id: string) {
  return new Promise<string | null>((resolve, reject) => {
    waiting.set(id, [...(waiting.get(id) ?? []), resolve]);
    failing.set(id, [...(failing.get(id) ?? []), reject]);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  });
}

/** Returns a function that gives the display name for an account id, or the id itself. */
export function useNames(ids: (string | null | undefined)[]) {
  const client = useQueryClient();
  const unique = [...new Set(ids.filter((id): id is string => !!id))].sort();
  const names = useQueries({
    queries: unique.map((id) => ({
      queryKey: qk.names(id),
      queryFn: () => askName(id),
      /* A name, once known, stays. No name yet is asked again after 10 seconds. */
      staleTime: (query: { state: { data?: string | null } }) =>
        query.state.data ? Infinity : RETRY_MS,
      refetchInterval: (query: { state: { data?: string | null } }) =>
        query.state.data ? false : RETRY_MS,
      refetchOnWindowFocus: false,
      retry: false,
    })),
    /* One string that changes when any name comes in, so the function below changes too. */
    combine: (results) => results.map((r) => r.data ?? "").join("\n"),
  });
  return useCallback(
    (id: string) => client.getQueryData<string | null>(qk.names(id)) || id,
    [client, names],
  );
}
