import { expect, it, vi } from "vitest";
import { drainWork, startWorker } from "./worker";
it("waits for running work and starts no new tick during shutdown", async () => {
  vi.useFakeTimers();
  try {
    let finish!: () => void;
    const work = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const stop = startWorker("test", 5000, work);
    let drained = false;
    const pending = stop().then(() => {
      drained = true;
    });
    await vi.advanceTimersByTimeAsync(10000);
    expect(work).toHaveBeenCalledTimes(1);
    expect(drained).toBe(false);
    finish();
    await pending;
    expect(drained).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
it("bounds shutdown when work never returns", async () => {
  vi.useFakeTimers();
  try {
    const pending = drainWork([() => new Promise(() => {})], 25000);
    await vi.advanceTimersByTimeAsync(25000);
    expect(await pending).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});
