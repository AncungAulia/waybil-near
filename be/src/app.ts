import express, { type Router } from "express";
import cors from "cors";
import type { Env } from "./config/env";
import type { Store } from "./types/db";
import type { Chain } from "./lib/near";
import { Sessions } from "./lib/session";
import { authenticate } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error-handler";
import { limiter } from "./middlewares/rate-limit";
import { ApiException } from "./lib/errors";

export interface AppDeps {
  env: Env;
  store: Store;
  chain: Chain;
  sessions: Sessions;
}
export function createApp(deps: AppDeps, routes?: Router) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", deps.env.TRUST_PROXY_HOPS);
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  const origins = deps.env.CORS_ORIGINS.split(",").map((s) => s.trim());
  app.use(
    cors({
      origin(origin, done) {
        if (!origin || origins.includes(origin)) done(null, true);
        else done(new ApiException(403, "E_ACCESS"));
      },
    }),
  );
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/v1", limiter(120), express.json({ limit: "64kb" }));
  if (routes) app.use("/v1", routes);
  app.get("/v1/me", authenticate(deps.sessions, deps.store), async (req, res) => {
    res.json((await deps.store.get("profiles", req.auth!.accountId))!.value);
  });
  app.use(() => {
    throw new ApiException(404, "E_NOT_FOUND");
  });
  app.use(errorHandler);
  return app;
}
