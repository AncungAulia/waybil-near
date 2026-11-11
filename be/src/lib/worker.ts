import { logError } from "./logger";
export function startWorker(
  operation: string,
  interval: number,
  work: () => Promise<void>,
): () => Promise<void> {
  let stopped = false;
  let running: Promise<void> | null = null;
  const run = () => {
    if (stopped || running) return;
    running = work()
      .catch((error: unknown) => logError(operation, error))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(run, interval);
  timer.unref();
  run();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await running;
  };
}
export async function drainWork(
  stops: Array<() => Promise<unknown>>,
  timeoutMs = 25000,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.all(stops.map((stop) => stop())).then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
