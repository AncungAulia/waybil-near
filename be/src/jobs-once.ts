import { existsSync } from "node:fs";
import { readEnv } from "./config/env";
import { supabaseClient, SupabaseStore } from "./lib/supabase";
import { NearViews } from "./lib/near";
import { Sessions } from "./lib/session";
import { createRuntime } from "./routes";

if (existsSync(".env")) process.loadEnvFile(".env");
const env = readEnv();
const runtime = createRuntime({
  env,
  store: new SupabaseStore(supabaseClient(env)),
  chain: new NearViews(env),
  sessions: new Sessions(env),
});
const result = await runtime.jobs.runAll();
console.log(JSON.stringify(result));
if (result.jobs.some((j) => j.state === "failed") || "error" in result.email) process.exitCode = 1;
