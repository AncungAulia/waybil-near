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

export function createRoutes(deps: AppDeps) {
  const router = Router();
  const invites = new Invites(deps.store, deps.chain, deps.env.APP_URL);
  const leases = new DatabaseLeases(supabaseClient(deps.env));
  const provider = sdkProvider(deps.env);
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
  router.use(inviteRoutes(deps, invites, (accountId) => auth.subjectFor(accountId)));
  router.use(
    relayRoutes(
      deps,
      new RelayService(
        deps.store,
        deps.chain,
        new NearRelayer(deps.env, provider),
        leases,
        deps.env.WAYBIL_CONTRACT,
      ),
    ),
  );
  return router;
}
