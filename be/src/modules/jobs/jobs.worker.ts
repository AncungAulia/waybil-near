import type { Jobs } from "./jobs.service";
import { startWorker } from "../../lib/worker";
import { logError } from "../../lib/logger";
export function startJobsWorker(jobs: Jobs): () => Promise<void> {
  return startWorker("jobs_worker", 60000, async () => {
    const result = await jobs.runAll();
    for (const job of result.jobs)
      if (job.state === "failed")
        logError(`job_${job.kind}`, new Error(), { code: job.error ?? "E_JOB" });
    if ("error" in result.email)
      logError("email_flush", new Error(), {
        code: typeof result.email.error === "string" ? result.email.error : "E_EMAIL_SEND",
      });
  });
}
