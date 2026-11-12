import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { limiter } from "../../middlewares/rate-limit";
import { parse } from "../../middlewares/validate";
import { tripParam } from "../trips/trips.schema";
import { arrivalLookup } from "./arrivals.schema";
import { Arrivals } from "./arrivals.service";

export function arrivalRoutes(deps: AppDeps, arrivals: Arrivals) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.get("/trips/:shipmentId/code", auth, roles("driver"), async (req, res) => {
    res.json(await arrivals.code(principal(req), parse(tripParam, req.params).shipmentId));
  });
  router.post(
    "/arrivals/lookup",
    auth,
    roles("warehouse"),
    limiter(20, 60000, (req) => principal(req).accountId),
    async (req, res) => {
      res.json(await arrivals.lookup(principal(req), parse(arrivalLookup, req.body).code));
    },
  );
  return router;
}
