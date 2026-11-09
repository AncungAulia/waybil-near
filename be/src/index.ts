import { existsSync } from "node:fs";
import { readEnv } from "./config/env";
import { createApp } from "./app";
import { supabaseClient, SupabaseStore } from "./lib/supabase";
import { NearViews } from "./lib/near";
import { Sessions } from "./lib/session";
import { createRuntime } from "./routes";
import { startCreditWorker } from "./modules/credit/credit.worker";
import { startJobsWorker } from "./modules/jobs/jobs.worker";

if (existsSync(".env")) process.loadEnvFile(".env");
const env = readEnv();
const store = new SupabaseStore(supabaseClient(env));
const deps = { env, store, chain: new NearViews(env), sessions: new Sessions(env) };
const runtime = createRuntime(deps);
const app = createApp(deps, runtime.router);
const stopCredit = env.CREDIT_WORKER_ENABLED ? startCreditWorker(runtime.credit) : () => {};
const stopJobs = env.JOBS_WORKER_ENABLED ? startJobsWorker(runtime.jobs) : () => {};
const server = app.listen(env.PORT, () => {
  console.log(`Waybil API listening on port ${env.PORT}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopCredit();
    stopJobs();
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  });
