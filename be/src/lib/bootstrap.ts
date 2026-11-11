import { existsSync } from "node:fs";
import { readEnv } from "../config/env";
import { supabaseClient, SupabaseStore } from "./supabase";
import { NearViews } from "./near";
import { Sessions } from "./session";
import { createRuntime } from "../routes";
export function bootstrap() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const env = readEnv();
  const deps = {
    env,
    store: new SupabaseStore(supabaseClient(env)),
    chain: new NearViews(env),
    sessions: new Sessions(env),
  };
  return { env, deps, runtime: createRuntime(deps) };
}
