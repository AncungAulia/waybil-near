import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbError } from "./supabase";
import { conflict, unavailable } from "./errors";

export interface Leases {
  run<T>(key: string, work: () => Promise<T>): Promise<T>;
}
export class DatabaseLeases implements Leases {
  constructor(private client: SupabaseClient | null) {}
  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const db = this.client ?? unavailable();
    const owner = randomUUID();
    const { data, error } = await db.rpc("claim_work_lease", {
      lease_key: key,
      lease_owner: owner,
      ttl_seconds: 300,
    });
    dbError(error);
    if (!data) conflict();
    try {
      return await work();
    } finally {
      await db.rpc("release_work_lease", { lease_key: key, lease_owner: owner });
    }
  }
}
