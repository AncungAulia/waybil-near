import { bootstrap } from "./lib/bootstrap";
const { runtime } = bootstrap();
const result = await runtime.jobs.runAll();
console.log(JSON.stringify(result));
if (result.jobs.some((j) => j.state === "failed") || "error" in result.email) process.exitCode = 1;
