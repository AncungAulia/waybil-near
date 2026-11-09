import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles, team } from "../../middlewares/auth";
import { accountId, parse } from "../../middlewares/validate";
import { Credit } from "./credit.service";
import { reviewRequest } from "./credit.schema";
export function creditRoutes(deps: AppDeps, service: Credit) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.post("/credit/review", auth, roles("shipper"), async (req, res) => {
    parse(reviewRequest, req.body ?? {});
    res.status(202).json({ review: await service.request(principal(req)) });
  });
  router.get("/credit/reviews/me", auth, roles("shipper"), async (req, res) => {
    res.json({ review: await service.latest(principal(req)) });
  });
  router.get("/credit/reviews/:id/proof", auth, async (req, res) => {
    res.json(
      await service.proof(
        principal(req),
        parse(z.object({ id: z.string().min(1).max(128) }), req.params).id,
      ),
    );
  });
  router.get("/admin/credit/reviews/:shipper", auth, team(deps.chain), async (req, res) => {
    res.json({
      review: await service.latest(
        principal(req),
        parse(z.object({ shipper: accountId }), req.params).shipper,
      ),
    });
  });
  return router;
}
