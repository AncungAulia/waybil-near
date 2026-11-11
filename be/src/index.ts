import { drainWork } from "./lib/worker";
import { logError } from "./lib/logger";
import { bootstrap } from "./lib/bootstrap";
import { createApp } from "./app";
import { startCreditWorker } from "./modules/credit/credit.worker";
import { startJobsWorker } from "./modules/jobs/jobs.worker";

const { env, deps, runtime } = bootstrap();
const app = createApp(deps, runtime.router);
const stopCredit = env.CREDIT_WORKER_ENABLED ? startCreditWorker(runtime.credit) : async () => {};
const stopJobs = env.JOBS_WORKER_ENABLED ? startJobsWorker(runtime.jobs) : async () => {};
const server = app.listen(env.PORT, () => {
  console.log(`Waybil API listening on port ${env.PORT}`);
});
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    void (async () => {
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeIdleConnections();
      const drained = await drainWork([stopCredit, stopJobs, () => closed]);
      if (!drained) {
        logError("shutdown", new Error(), { code: "E_SHUTDOWN_TIMEOUT" });
        server.closeAllConnections();
      }
      process.exit(drained ? 0 : 1);
    })().catch((error: unknown) => {
      logError("shutdown", error);
      process.exit(1);
    });
  });
