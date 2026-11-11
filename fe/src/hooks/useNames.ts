"use client";
import { useEffect, useMemo, useState } from "react";
import type { ProfilesResponse } from "@waybil/shared";
import { api } from "@/lib/api";

/*
 * Shipments on chain only hold account ids. This turns them into the names people set: the
 * company for a shipper, the person's name for everyone else (GET /v1/profiles). Names are
 * kept for the whole visit, so each account is asked for once. An account with no name, or
 * one the API can't answer for, shows its id.
 */
const known = new Map<string, string>();
const asked = new Set<string>();
const listeners = new Set<() => void>();

async function ask(ids: string[]) {
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const { profiles } = await api<ProfilesResponse>(
        `/profiles?ids=${batch.map(encodeURIComponent).join(",")}`,
      );
      for (const p of profiles) if (p.name) known.set(p.accountId, p.name);
    } catch {
      /* The id stays on screen. Let a later screen ask again. */
      for (const id of batch) asked.delete(id);
    }
  }
  listeners.forEach((notify) => notify());
}

/** Returns a function that gives the display name for an account id, or the id itself. */
export function useNames(ids: (string | null | undefined)[]) {
  const [, rerender] = useState(0);
  const key = [...new Set(ids.filter((id): id is string => !!id))].sort().join(",");
  useEffect(() => {
    const notify = () => rerender((n) => n + 1);
    listeners.add(notify);
    const missing = key ? key.split(",").filter((id) => !asked.has(id)) : [];
    missing.forEach((id) => asked.add(id));
    if (missing.length) void ask(missing);
    return () => {
      listeners.delete(notify);
    };
  }, [key]);
  return useMemo(() => (id: string) => known.get(id) ?? id, []);
}
