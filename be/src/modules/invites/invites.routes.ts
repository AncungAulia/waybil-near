import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { codeParam, inviteCreate } from "./invites.schema";
import { Invites } from "./invites.service";

export function inviteRoutes(
  deps: AppDeps,
  invites: Invites,
  subjectFor: (accountId: string) => Promise<string>,
) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.get("/invites/:code", async (req, res) => {
    res.json(await invites.read(parse(codeParam, req.params).code));
  });
  router.get("/invites", auth, roles("shipper"), async (req, res) => {
    res.json(await invites.list(principal(req)));
  });
  router.post("/invites", auth, roles("shipper"), async (req, res) => {
    res.status(201).json(await invites.create(principal(req), parse(inviteCreate, req.body)));
  });
  router.post("/invites/:code/accept", auth, roles("driver", "warehouse"), async (req, res) => {
    res.json(
      await invites.accept(
        principal(req),
        parse(codeParam, req.params).code,
        await subjectFor(principal(req).accountId),
      ),
    );
  });
  return router;
}
