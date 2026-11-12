import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { locationUpdate, tripCreate, tripIds, tripParam } from "./trips.schema";
import { Trips } from "./trips.service";

export function tripRoutes(deps: AppDeps, trips: Trips) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  const people = roles("shipper", "driver", "warehouse");
  router.get("/trips", auth, people, async (req, res) => {
    res.json(await trips.many(principal(req), parse(tripIds, req.query).ids));
  });
  router.put("/trips/:shipmentId", auth, roles("shipper"), async (req, res) => {
    res.json(
      await trips.create(
        principal(req),
        parse(tripParam, req.params).shipmentId,
        parse(tripCreate, req.body),
      ),
    );
  });
  router.get("/trips/:shipmentId", auth, people, async (req, res) => {
    res.json(await trips.read(principal(req), parse(tripParam, req.params).shipmentId));
  });
  router.post("/trips/:shipmentId/location", auth, roles("driver"), async (req, res) => {
    res.json(
      await trips.locate(
        principal(req),
        parse(tripParam, req.params).shipmentId,
        parse(locationUpdate, req.body),
      ),
    );
  });
  return router;
}
