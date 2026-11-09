import type { Jobs } from "./jobs.service";

export function startJobsWorker(jobs: Jobs): () => void {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      const result = await jobs.runAll();
      if (result.jobs.some((j) => j.state === "failed") || "error" in result.email)
        console.error("A scheduled job could not finish. Check the saved job and email records.");
    } catch {
      console.error("The scheduler could not read its queue.");
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => {
    void run();
  }, 60000);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
