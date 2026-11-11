import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { profileIds } from "./profiles.schema";
import { Profiles } from "./profiles.service";

export function profileRoutes(deps: AppDeps, profiles: Profiles) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.get("/profiles", auth, async (req, res) => {
    res.json(await profiles.names(parse(profileIds, req.query).ids));
  });
  router.get("/me/destinations", auth, roles("warehouse"), async (req, res) => {
    res.json(await profiles.destinations(principal(req)));
  });
  return router;
}
