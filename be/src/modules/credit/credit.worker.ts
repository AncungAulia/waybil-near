import type { Credit } from "./credit.service";
import { startWorker } from "../../lib/worker";
export function startCreditWorker(credit: Credit): () => Promise<void> {
  return startWorker("credit_worker", 5000, async () => {
    await credit.tick();
  });
}
