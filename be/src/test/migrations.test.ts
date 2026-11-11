import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { it, expect } from "vitest";

it("applies migrations with private domain tables and concurrent-update protection", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    await db.exec(
      "create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
    );
    const dir = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
    for (const file of (await readdir(dir)).filter((v) => v.endsWith(".sql")).sort())
      await db.exec(await readFile(`${dir}/${file}`, "utf8"));
    await db.query("insert into profiles(id,data) values ($1,$2)", [
      "a.testnet",
      { accountId: "a.testnet", role: "shipper", authMethod: "wallet", sessionVersion: 0 },
    ]);
    const first = await db.query(
      "update profiles set version=version+1 where id='a.testnet' and version=0 returning version",
    );
    const stale = await db.query(
      "update profiles set version=version+1 where id='a.testnet' and version=0 returning version",
    );
    expect(first.rows).toHaveLength(1);
    expect(stale.rows).toHaveLength(0);
    const owner = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    expect(
      (await db.query("select claim_work_lease('sample',$1,300) as claimed", [owner])).rows,
    ).toEqual([{ claimed: true }]);
    expect(
      (await db.query("select claim_work_lease('sample',$1,300) as claimed", [other])).rows,
    ).toEqual([{ claimed: false }]);
    await db.query("select release_work_lease('sample',$1)", [other]);
    expect(
      (await db.query("select claim_work_lease('sample',$1,300) as claimed", [other])).rows,
    ).toEqual([{ claimed: false }]);
    await db.query("select release_work_lease('sample',$1)", [owner]);
    expect(
      (await db.query("select claim_work_lease('sample',$1,300) as claimed", [other])).rows,
    ).toEqual([{ claimed: true }]);
    await db.exec("set role anon");
    await expect(db.query("select * from profiles")).rejects.toThrow();
    await expect(db.query("select claim_work_lease('sample',$1,300)", [owner])).rejects.toThrow();
  } finally {
    await db.close();
  }
});
