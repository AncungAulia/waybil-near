import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal } from "../../middlewares/auth";
import { limiter } from "../../middlewares/rate-limit";
import { parse } from "../../middlewares/validate";
import { challengeRequest, walletLogin, googleLogin, profileUpdate } from "./auth.schema";
import { AuthService } from "./auth.service";
export function authRoutes(deps: AppDeps, service: AuthService) {
  const router = Router();
  router.use("/auth", limiter(20));
  router.post("/auth/challenge", async (req, res) => {
    res.status(201).json(await service.challenge(parse(challengeRequest, req.body)));
  });
  router.post("/auth/wallet", async (req, res) => {
    res.json(await service.wallet(parse(walletLogin, req.body)));
  });
  router.post("/auth/google", async (req, res) => {
    res.json(await service.google(parse(googleLogin, req.body)));
  });
  router.post("/auth/logout", authenticate(deps.sessions, deps.store), async (req, res) => {
    res.json(await service.logout(principal(req).accountId));
  });
  router.put("/me/profile", authenticate(deps.sessions, deps.store), async (req, res) => {
    res.json(await service.updateProfile(principal(req).accountId, parse(profileUpdate, req.body)));
  });
  return router;
}
