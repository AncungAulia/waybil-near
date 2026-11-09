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
console.log(JSON.stringify(await runtime.credit.tick()));
