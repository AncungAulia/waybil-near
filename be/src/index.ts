import { existsSync } from "node:fs";
import { readEnv } from "./config/env";
import { createApp } from "./app";
import { supabaseClient, SupabaseStore } from "./lib/supabase";
import { NearViews } from "./lib/near";
import { Sessions } from "./lib/session";
import { createRoutes } from "./routes";

if (existsSync(".env")) process.loadEnvFile(".env");
const env = readEnv();
const store = new SupabaseStore(supabaseClient(env));
const deps = { env, store, chain: new NearViews(env), sessions: new Sessions(env) };
const app = createApp(deps, createRoutes(deps));
const server = app.listen(env.PORT, () => {
  console.log(`Waybil API listening on port ${env.PORT}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  });
