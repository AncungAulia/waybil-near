import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { uploadFiles, uploaded } from "../../middlewares/upload";
import { ApiException } from "../../lib/errors";
import { Reports } from "./reports.service";
import { reportInput, reportMultipart, reportParam } from "./reports.schema";
export function reportRoutes(deps: AppDeps, service: Reports) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.post("/reports", auth, roles("warehouse"), uploadFiles("photos", 5), async (req, res) => {
    let data: unknown;
    try {
      data = JSON.parse(parse(reportMultipart, req.body).report);
    } catch {
      throw new ApiException(400, "E_VALIDATION");
    }
    res.status(201).json(
      await service.create(
        principal(req),
        parse(reportInput, data),
        uploaded(req).map((file) => file.buffer),
      ),
    );
  });
  router.get("/reports/:shipmentId", auth, async (req, res) => {
    res.json(await service.read(principal(req), parse(reportParam, req.params).shipmentId));
  });
  return router;
}
