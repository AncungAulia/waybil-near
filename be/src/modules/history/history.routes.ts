import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { PoolHistory } from "./history.service";

export function historyRoutes(deps: AppDeps, history: PoolHistory) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.get("/me/history", auth, roles("investor"), async (req, res) => {
    res.json(await history.history(principal(req)));
  });
  return router;
}
