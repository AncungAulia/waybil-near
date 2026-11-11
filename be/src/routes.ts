import { Router } from "express";
import type { AppDeps } from "./app";
import { unavailable } from "./lib/errors";
import { Invites } from "./modules/invites/invites.service";
import { inviteRoutes } from "./modules/invites/invites.routes";

export function createRoutes(deps: AppDeps) {
  const router = Router();
  const invites = new Invites(deps.store, deps.chain, deps.env.APP_URL);
  router.use(inviteRoutes(deps, invites, async () => unavailable()));
  return router;
}
