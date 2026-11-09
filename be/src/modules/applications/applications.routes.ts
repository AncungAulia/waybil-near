import { Router } from "express";
import type { AppDeps } from "../../app";
import { authenticate, principal, roles, team } from "../../middlewares/auth";
import { parse } from "../../middlewares/validate";
import { uploadFiles, uploaded } from "../../middlewares/upload";
import { ApiException } from "../../lib/errors";
import { Applications } from "./applications.service";
import {
  applicationId,
  companyInput,
  documentInput,
  rejectionInput,
  proposalInput,
} from "./applications.schema";
export function applicationRoutes(deps: AppDeps, service: Applications) {
  const router = Router();
  const auth = authenticate(deps.sessions, deps.store);
  router.post("/applications", auth, roles("shipper"), async (req, res) => {
    res
      .status(201)
      .json({ application: await service.create(principal(req), parse(companyInput, req.body)) });
  });
  router.get("/applications/me", auth, roles("shipper"), async (req, res) => {
    res.json(await service.mine(principal(req)));
  });
  router.put("/applications/:id", auth, roles("shipper"), async (req, res) => {
    res.json({
      application: await service.edit(
        principal(req),
        parse(applicationId, req.params).id,
        parse(companyInput, req.body),
      ),
    });
  });
  router.post(
    "/applications/:id/documents",
    auth,
    roles("shipper"),
    uploadFiles("file", 1),
    async (req, res) => {
      const files = uploaded(req);
      if (files.length !== 1) throw new ApiException(400, "E_VALIDATION");
      res
        .status(201)
        .json(
          await service.upload(
            principal(req),
            parse(applicationId, req.params).id,
            parse(documentInput, req.body).kind,
            files[0]!.buffer,
          ),
        );
    },
  );
  router.post("/applications/:id/submit", auth, roles("shipper"), async (req, res) => {
    res
      .status(202)
      .json({
        application: await service.submit(principal(req), parse(applicationId, req.params).id),
      });
  });
  router.get("/admin/applications", auth, team(deps.chain), async (req, res) => {
    res.json(await service.adminList(principal(req)));
  });
  router.get("/admin/applications/:id", auth, team(deps.chain), async (req, res) => {
    res.json(await service.adminDetail(principal(req), parse(applicationId, req.params).id));
  });
  router.post("/admin/applications/:id/reject", auth, team(deps.chain), async (req, res) => {
    res.json(
      await service.reject(
        principal(req),
        parse(applicationId, req.params).id,
        parse(rejectionInput, req.body),
      ),
    );
  });
  router.post("/admin/applications/:id/proposal", auth, team(deps.chain), async (req, res) => {
    res.json({
      application: await service.linkProposal(
        principal(req),
        parse(applicationId, req.params).id,
        parse(proposalInput, req.body).proposalId,
      ),
    });
  });
  return router;
}
