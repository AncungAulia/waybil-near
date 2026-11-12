import { Router } from "express";
import type { AppDeps } from "./app";
import { supabaseClient } from "./lib/supabase";
import { DatabaseLeases } from "./lib/leases";
import { sdkProvider } from "./lib/near-sdk";
import { RecoveryKeys } from "./lib/recovery";
import { AuthService } from "./modules/auth/auth.service";
import { AuthProvider } from "./modules/auth/auth.provider";
import { authRoutes } from "./modules/auth/auth.routes";
import { Invites } from "./modules/invites/invites.service";
import { inviteRoutes } from "./modules/invites/invites.routes";
import { RelayService } from "./modules/relay/relay.service";
import { NearRelayer } from "./modules/relay/relay.provider";
import { relayRoutes } from "./modules/relay/relay.routes";
import { PrivateFiles } from "./lib/storage";
import { Emails, ResendTransport } from "./lib/email";
import { Applications } from "./modules/applications/applications.service";
import { applicationRoutes } from "./modules/applications/applications.routes";
import { Reports } from "./modules/reports/reports.service";
import { reportRoutes } from "./modules/reports/reports.routes";
import { NearAI } from "./lib/near-ai";
import { Credit } from "./modules/credit/credit.service";
import { NearCreditWriter } from "./modules/credit/credit.writer";
import { creditRoutes } from "./modules/credit/credit.routes";
import { AdminNotes } from "./modules/admin/admin.service";
import { NearPauseProof } from "./modules/admin/admin.proof";
import { adminRoutes } from "./modules/admin/admin.routes";
import { Jobs } from "./modules/jobs/jobs.service";
import { Profiles } from "./modules/profiles/profiles.service";
import { profileRoutes } from "./modules/profiles/profiles.routes";
import { PoolHistory, txBudget } from "./modules/history/history.service";
import { NearBlocksEvents } from "./modules/history/history.source";
import { historyRoutes } from "./modules/history/history.routes";
import { Places } from "./modules/places/places.service";
import { placeRoutes } from "./modules/places/places.routes";
import { Trips } from "./modules/trips/trips.service";
import { tripRoutes } from "./modules/trips/trips.routes";
import { Arrivals } from "./modules/arrivals/arrivals.service";
import { arrivalRoutes } from "./modules/arrivals/arrivals.routes";

export function createRuntime(deps: AppDeps) {
  const router = Router();
  const invites = new Invites(deps.store, deps.chain, deps.env.APP_URL);
  const leases = new DatabaseLeases(supabaseClient(deps.env));
  const provider = sdkProvider(deps.env);
  const files = new PrivateFiles(supabaseClient(deps.env));
  const emails = new Emails(deps.store, new ResendTransport(deps.env), leases);
  const creditWriter = new NearCreditWriter(deps.env, provider);
  const credit = new Credit(
    deps.store,
    deps.chain,
    files,
    new NearAI(deps.env),
    creditWriter,
    leases,
    deps.env,
  );
  const applications = new Applications(deps.store, deps.chain, files, emails, leases, (app) =>
    credit.beginInitial(app),
  );
  const reports = new Reports(deps.store, deps.chain, files, leases);
  const auth = new AuthService(
    deps.store,
    deps.chain,
    new AuthProvider(deps.env, provider, leases),
    deps.sessions,
    leases,
    invites,
    deps.env,
    new RecoveryKeys(deps.env.RECOVERY_ENCRYPTION_KEY),
  );
  router.use(authRoutes(deps, auth));
  router.use(creditRoutes(deps, credit));
  router.use(applicationRoutes(deps, applications));
  router.use(reportRoutes(deps, reports));
  router.use(
    placeRoutes(
      deps,
      new Places(deps.store, deps.env.PHOTON_URL, fetch, Date.now, deps.env.ORS_API_KEY),
    ),
  );
  router.use(tripRoutes(deps, new Trips(deps.store, deps.chain, deps.env)));
  router.use(arrivalRoutes(deps, new Arrivals(deps.store, deps.chain)));
  router.use(inviteRoutes(deps, invites, (accountId) => auth.subjectFor(accountId)));
  router.use(profileRoutes(deps, new Profiles(deps.store, deps.chain)));
  router.use(
    historyRoutes(
      deps,
      new PoolHistory(
        deps.store,
        new NearBlocksEvents(
          deps.env.NEARBLOCKS_API_URL,
          deps.env.WAYBIL_CONTRACT,
          deps.env.NEARBLOCKS_API_KEY,
        ),
        deps.env.WAYBIL_CONTRACT,
        txBudget(deps.env.NEARBLOCKS_API_KEY),
      ),
    ),
  );
  const relay = new RelayService(
    deps.store,
    deps.chain,
    new NearRelayer(deps.env, provider),
    leases,
    deps.env.WAYBIL_CONTRACT,
    (shipment, hash, goodQty) => reports.validateConfirmation(shipment, hash, goodQty),
  );
  router.use(relayRoutes(deps, relay));
  router.use(
    adminRoutes(
      deps,
      new AdminNotes(
        deps.store,
        deps.chain,
        leases,
        new NearPauseProof(provider, deps.env.WAYBIL_CONTRACT),
      ),
    ),
  );
  const jobs = new Jobs(deps.store, deps.chain, leases, emails, applications, files, relay, () =>
    creditWriter.time(),
  );
  return { router, credit, jobs };
}
