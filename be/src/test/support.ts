import { conflict } from "../lib/errors";
import type { Store, Snapshot, Table } from "../types/db";
import { readEnv } from "../config/env";
import { Sessions } from "../lib/session";
import type { Profile } from "@waybil/shared";
import type { Leases } from "../lib/leases";
import type { Bucket, FileStore } from "../lib/storage";

export class MemoryFiles implements FileStore {
  objects = new Map<string, Uint8Array>();
  signed: string[] = [];
  async put(bucket: Bucket, path: string, bytes: Uint8Array) {
    this.objects.set(`${bucket}/${path}`, Uint8Array.from(bytes));
  }
  async read(bucket: Bucket, path: string) {
    const value = this.objects.get(`${bucket}/${path}`);
    if (!value) throw new Error("Missing test file");
    return value;
  }
  async remove(bucket: Bucket, path: string) {
    this.objects.delete(`${bucket}/${path}`);
  }
  async sign(bucket: Bucket, path: string) {
    this.signed.push(`${bucket}/${path}`);
    return `https://storage.example/signed/${bucket}/${path}`;
  }
}
export const samplePdf = Buffer.from(
  "%PDF-1.4\n% SAMPLE fixture document\n1 0 obj\n<<>>\nendobj\n%%EOF\n",
);
export const samplePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=",
  "base64",
);

export class MemoryLeases implements Leases {
  private held = new Set<string>();
  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    if (this.held.has(key)) conflict();
    this.held.add(key);
    try {
      return await work();
    } finally {
      this.held.delete(key);
    }
  }
}

export class MemoryStore implements Store {
  rows = new Map<string, Snapshot<unknown>>();
  async removeExpiredChallenges(now: string) {
    let count = 0;
    for (const [key, row] of this.rows) {
      if (
        key.startsWith("auth_challenges/") &&
        (row.value as { expiresAt: string }).expiresAt < now
      ) {
        this.rows.delete(key);
        count++;
      }
    }
    return count;
  }
  async get<T>(table: Table, id: string): Promise<Snapshot<T> | null> {
    return structuredClone(this.rows.get(`${table}/${id}`) ?? null) as Snapshot<T> | null;
  }
  async list<T>(table: Table, filter: Record<string, unknown> = {}): Promise<Array<Snapshot<T>>> {
    return [...this.rows.entries()]
      .filter(
        ([k, row]) =>
          k.startsWith(`${table}/`) &&
          Object.entries(filter).every(
            ([field, v]) =>
              JSON.stringify((row.value as Record<string, unknown>)[field]) === JSON.stringify(v),
          ),
      )
      .map(([, row]) => structuredClone(row) as Snapshot<T>);
  }
  async insert<T>(table: Table, id: string, value: T): Promise<Snapshot<T>> {
    if (this.rows.has(`${table}/${id}`)) conflict();
    const row = { value: structuredClone(value), version: 0 };
    this.rows.set(`${table}/${id}`, row);
    return structuredClone(row);
  }
  async replace<T>(table: Table, id: string, version: number, value: T): Promise<Snapshot<T>> {
    if (this.rows.get(`${table}/${id}`)?.version !== version) conflict();
    const row = { value: structuredClone(value), version: version + 1 };
    this.rows.set(`${table}/${id}`, row);
    return structuredClone(row);
  }
  async remove(table: Table, id: string, version: number) {
    if (this.rows.get(`${table}/${id}`)?.version !== version) conflict();
    this.rows.delete(`${table}/${id}`);
  }
}
export const testEnv = () =>
  readEnv({ JWT_SECRET: "test-secret-with-more-than-thirty-two-characters" });
export function testDeps() {
  const env = testEnv();
  const store = new MemoryStore();
  return {
    env,
    store,
    sessions: new Sessions(env),
    chain: {
      async view<T>() {
        return false as T;
      },
    },
  };
}
export function profile(role: Profile["role"] = "shipper"): Profile {
  return {
    accountId: `${role}.testnet`,
    role,
    authMethod: role === "driver" || role === "warehouse" ? "google" : "wallet",
    name: "Test Person",
    phone: "+12075550142",
    email: "sample@example.com",
    truckPlate: null,
    sessionVersion: 0,
  };
}
