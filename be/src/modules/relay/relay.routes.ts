import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { AppDeps } from "../../app";
import { authenticate, principal } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { relayRequest } from "./relay.schema";
import { RelayService } from "./relay.service";
export function relayRoutes(deps: AppDeps, service: RelayService) {
  const router = Router();
  router.post(
    "/relay",
    authenticate(deps.sessions, deps.store),
    rateLimit({
      limit: 30,
      windowMs: 60000,
      keyGenerator: (req) => principal(req).accountId,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: { code: "E_RATE_LIMIT", message: "Please wait before trying again." } },
    }),
    async (req, res) => {
      const body = parse(relayRequest, req.body);
      const result = await service.relay(principal(req), body.signedDelegate, body.arrivalCode);
      res.status(result.status === "pending" ? 202 : 200).json(result);
    },
  );
  return router;
}
