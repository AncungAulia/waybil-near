import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { limiter } from "../../middlewares/rate-limit";
import { parse } from "../../middlewares/validate";
import { placeCreate, placeSearch } from "./places.schema";
import { Places } from "./places.service";

export function placeRoutes(deps: AppDeps, places: Places) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.get("/places/search", limiter(30), auth, roles("shipper"), async (req, res) => {
    res.json(await places.search(principal(req), parse(placeSearch, req.query).q));
  });
  router.get("/places", auth, roles("shipper", "warehouse"), async (req, res) => {
    res.json(await places.list(principal(req)));
  });
  router.post("/places", auth, roles("shipper"), async (req, res) => {
    res.status(201).json(await places.create(principal(req), parse(placeCreate, req.body)));
  });
  return router;
}
