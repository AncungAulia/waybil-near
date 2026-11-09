import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseLeases } from "./leases";
import { assertLeases } from "./lease-context";

it("renews long-running work and prevents further side effects after losing ownership", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  try {
    let owned = true;
    const rpc = vi.fn().mockImplementation(async (name: string) => ({
      data: name === "claim_work_lease" ? true : owned,
      error: null,
    }));
    const leases = new DatabaseLeases({ rpc } as unknown as SupabaseClient);
    let ready!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const effect = vi.fn();
    const result = leases
      .run("sample-job", async () => {
        ready();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        assertLeases();
        effect();
      })
      .then(
        () => null,
        (error) => error,
      );
    await started;
    await vi.advanceTimersByTimeAsync(60000);
    expect(rpc.mock.calls.map((call) => call[0])).toContain("renew_work_lease");
    owned = false;
    await vi.advanceTimersByTimeAsync(60000);
    release();
    expect(await result).toMatchObject({ code: "E_LEASE_LOST" });
    expect(effect).not.toHaveBeenCalled();
    const calls = rpc.mock.calls;
    expect(calls.at(-1)![0]).toBe("release_work_lease");
    expect(calls[0]![1].lease_owner).toBe(calls.at(-1)![1].lease_owner);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
