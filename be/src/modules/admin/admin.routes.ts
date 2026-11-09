import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, team } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { AdminNotes } from "./admin.service";
import { proposalParam, proposalReasonInput, pauseInput, shipperParam } from "./admin.schema";
export function adminRoutes(deps: AppDeps, notes: AdminNotes) {
  const router = Router();
  router.use("/admin", authenticate(deps.sessions, deps.store), team(deps.chain));
  router.post("/admin/proposals/:id/reasons", async (req, res) => {
    res
      .status(201)
      .json(
        await notes.saveReason(
          principal(req),
          parse(proposalParam, req.params).id,
          parse(proposalReasonInput, req.body),
        ),
      );
  });
  router.get("/admin/proposals/:id/reasons", async (req, res) => {
    res.json(await notes.reasons(principal(req), parse(proposalParam, req.params).id));
  });
  router.post("/admin/pauses", async (req, res) => {
    res.status(201).json(await notes.savePause(principal(req), parse(pauseInput, req.body)));
  });
  router.get("/admin/pauses/:shipper", async (req, res) => {
    res.json(await notes.pausesFor(principal(req), parse(shipperParam, req.params).shipper));
  });
  return router;
}
