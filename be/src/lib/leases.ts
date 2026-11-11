import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbError } from "./supabase";
import { ApiException, conflict, unavailable } from "./errors";
import { assertLeases, withLeaseContext } from "./lease-context";

export interface Leases {
  run<T>(key: string, work: () => Promise<T>): Promise<T>;
}
export class DatabaseLeases implements Leases {
  constructor(private client: SupabaseClient | null) {}
  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    assertLeases();
    const db = this.client ?? unavailable();
    const owner = randomUUID();
    let deadline = performance.now() + 300000;
    const { data, error } = await db.rpc("claim_work_lease", {
      lease_key: key,
      lease_owner: owner,
      ttl_seconds: 300,
    });
    dbError(error);
    if (!data) {
      if (key.startsWith("signer:"))
        throw new ApiException(
          503,
          "E_SIGNER_BUSY",
          "Another request is being recorded. Please try again shortly.",
        );
      conflict();
    }
    let lost = false;
    let renewal: Promise<void> | null = null;
    const guard = () => {
      if (lost || performance.now() >= deadline)
        throw new ApiException(503, "E_LEASE_LOST", "This request stopped. Please try again.");
    };
    const renew = async () => {
      const started = performance.now();
      try {
        guard();
        const result = await db.rpc("renew_work_lease", {
          lease_key: key,
          lease_owner: owner,
          ttl_seconds: 300,
        });
        guard();
        if (result.error || result.data !== true) lost = true;
        else deadline = started + 300000;
      } catch {
        lost = true;
      }
    };
    const timer = setInterval(() => {
      if (!renewal && !lost)
        renewal = renew().finally(() => {
          renewal = null;
        });
    }, 60000);
    timer.unref();
    try {
      return await withLeaseContext(guard, async () => {
        guard();
        const result = await work();
        guard();
        return result;
      });
    } finally {
      clearInterval(timer);
      lost = true;
      if (renewal) await renewal;
      await db.rpc("release_work_lease", { lease_key: key, lease_owner: owner });
    }
  }
}
