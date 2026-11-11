import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/env";
import { ApiException, conflict, unavailable } from "./errors";
import type { Snapshot, Store, Table } from "../types/db";
import { logError } from "./logger";
import { assertLeases } from "./lease-context";

export function supabaseClient(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(String(env.SUPABASE_URL), String(env.SUPABASE_SERVICE_ROLE_KEY), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        assertLeases();
        return fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(30000)])
            : AbortSignal.timeout(30000),
        });
      },
    },
  });
}
export function dbError(error: { code?: string } | null): void {
  if (!error) return;
  if (error.code === "23505") conflict();
  logError("database", error);
  throw new ApiException(
    503,
    "E_DATABASE",
    "Your information could not be saved. Please try again.",
  );
}
export class SupabaseStore implements Store {
  constructor(private client: SupabaseClient | null) {}
  private db() {
    assertLeases();
    return this.client ?? unavailable();
  }
  async removeExpiredChallenges(now: string): Promise<number> {
    const { count, error } = await this.db()
      .from("auth_challenges")
      .delete({ count: "exact" })
      .lt("data->>expiresAt", now);
    dbError(error);
    return count ?? 0;
  }
  async get<T>(table: Table, id: string): Promise<Snapshot<T> | null> {
    const { data, error } = await this.db()
      .from(table)
      .select("data,version")
      .eq("id", id)
      .maybeSingle();
    dbError(error);
    return data ? { value: data.data as T, version: data.version as number } : null;
  }
  async list<T>(table: Table, filter: Record<string, unknown> = {}): Promise<Array<Snapshot<T>>> {
    const rows: Array<Snapshot<T>> = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await this.db()
        .from(table)
        .select("data,version")
        .contains("data", filter)
        .order("id")
        .range(offset, offset + 99);
      dbError(error);
      for (const row of data ?? [])
        rows.push({ value: row.data as T, version: row.version as number });
      if (!data || data.length < 100) return rows;
    }
  }
  async insert<T>(table: Table, id: string, value: T): Promise<Snapshot<T>> {
    const { error } = await this.db().from(table).insert({ id, data: value, version: 0 });
    dbError(error);
    return { value, version: 0 };
  }
  async replace<T>(table: Table, id: string, version: number, value: T): Promise<Snapshot<T>> {
    const { data, error } = await this.db()
      .from(table)
      .update({ data: value, version: version + 1 })
      .eq("id", id)
      .eq("version", version)
      .select("version")
      .maybeSingle();
    dbError(error);
    if (!data) conflict();
    return { value, version: version + 1 };
  }
  async remove(table: Table, id: string, version: number): Promise<void> {
    const { data, error } = await this.db()
      .from(table)
      .delete()
      .eq("id", id)
      .eq("version", version)
      .select("id");
    dbError(error);
    if (!data?.length) conflict();
  }
}
