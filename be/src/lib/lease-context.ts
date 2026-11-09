import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage<Array<() => void>>();
export function assertLeases() {
  for (const guard of context.getStore() ?? []) guard();
}
export function withLeaseContext<T>(guard: () => void, work: () => Promise<T>) {
  return context.run([...(context.getStore() ?? []), guard], work);
}
