import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { SupabaseStore } from "./supabase";

it("runs the real store's JSON filters, pagination, version checks and expiry delete against PostgreSQL", async () => {
  const db = new PGlite();
  await db.exec(
    "create table profiles(id text primary key,data jsonb,version integer default 0); create table auth_challenges(id text primary key,data jsonb,version integer default 0);",
  );
  const methods: string[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1);
    if (table !== "profiles" && table !== "auth_challenges") throw new Error("Unexpected table");
    const method = init?.method ?? "GET";
    methods.push(`${method}:${table}`);
    const params: unknown[] = [];
    const bind = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    const filters: string[] = [];
    for (const [key, value] of url.searchParams) {
      if (key === "id") filters.push(`id=${bind(value.slice(3))}`);
      if (key === "version") filters.push(`version=${bind(Number(value.slice(3)))}`);
      if (key === "data") filters.push(`data @> ${bind(value.slice(3))}::jsonb`);
      if (key === "data->>expiresAt") filters.push(`data->>'expiresAt' < ${bind(value.slice(3))}`);
    }
    const where = filters.length ? `where ${filters.join(" and ")}` : "";
    let rows: unknown[];
    if (method === "POST") {
      const body = JSON.parse(String(init?.body));
      rows = (
        await db.query(
          `insert into ${table}(id,data,version) values (${bind(body.id)},${bind(JSON.stringify(body.data))}::jsonb,${bind(body.version)}) returning *`,
          params,
        )
      ).rows;
    } else if (method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      rows = (
        await db.query(
          `update ${table} set data=${bind(JSON.stringify(body.data))}::jsonb,version=${bind(body.version)} ${where} returning data,version`,
          params,
        )
      ).rows;
    } else if (method === "DELETE") {
      rows = (await db.query(`delete from ${table} ${where} returning id`, params)).rows;
    } else {
      rows = (
        await db.query(
          `select data,version from ${table} ${where} order by id limit ${bind(Number(url.searchParams.get("limit") ?? 1000))} offset ${bind(Number(url.searchParams.get("offset") ?? 0))}`,
          params,
        )
      ).rows;
    }
    const headers = new Headers(init?.headers);
    const data = headers.get("Accept")?.includes("application/vnd.pgrst.object+json")
      ? (rows[0] ?? null)
      : rows;
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Range": `*/${rows.length}` },
    });
  };
  try {
    const store = new SupabaseStore(
      createClient("https://sample.supabase.co", "test-service-role", {
        global: { fetch: request },
      }),
    );
    const values = Array.from({ length: 105 }, (_, i) => [
      `person-${String(i).padStart(3, "0")}`,
      JSON.stringify({ role: "driver", accountId: `person-${i}` }),
    ]);
    for (const [id, data] of values)
      await db.query("insert into profiles(id,data) values($1,$2::jsonb)", [id, data]);
    expect(await store.list("profiles", { role: "driver" })).toHaveLength(105);
    expect(await store.list("profiles", { role: "shipper" })).toEqual([]);
    const inserted = await store.insert("profiles", "shipper.testnet", { role: "shipper" });
    await store.replace("profiles", "shipper.testnet", inserted.version, {
      role: "shipper",
      changed: true,
    });
    await expect(store.replace("profiles", "shipper.testnet", 0, {})).rejects.toMatchObject({
      code: "E_CONFLICT",
    });
    await store.remove("profiles", "shipper.testnet", 1);
    expect(await store.get("profiles", "shipper.testnet")).toBeNull();
    await store.insert("auth_challenges", "old", { expiresAt: "2026-11-10T00:00:00.000Z" });
    await store.insert("auth_challenges", "fresh", { expiresAt: "2026-11-12T00:00:00.000Z" });
    expect(await store.removeExpiredChallenges("2026-11-11T00:00:00.000Z")).toBe(1);
    expect(await store.get("auth_challenges", "fresh")).not.toBeNull();
    expect(methods).toContain("DELETE:auth_challenges");
  } finally {
    await db.close();
  }
});
