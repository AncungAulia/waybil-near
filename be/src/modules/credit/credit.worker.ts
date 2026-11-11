import type { Credit } from "./credit.service";
export function startCreditWorker(credit: Credit): () => void {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      await credit.tick();
    } catch {
      console.error("The credit worker could not read its queue.");
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => {
    void run();
  }, 5000);
  timer.unref();
  void run();
  return () => {
    clearInterval(timer);
  };
}
