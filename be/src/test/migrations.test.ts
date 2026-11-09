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
    await db.exec("set role anon");
    await expect(db.query("select * from profiles")).rejects.toThrow();
  } finally {
    await db.close();
  }
});
