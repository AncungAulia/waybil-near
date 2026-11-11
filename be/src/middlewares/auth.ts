import type { Request, RequestHandler } from "express";
import type { Principal, Profile, Role } from "@waybil/shared";
import type { Store } from "../types/db";
import type { Chain } from "../lib/near";
import { Sessions } from "../lib/session";
import { ApiException, allowed } from "../lib/errors";

export function authenticate(sessions: Sessions, store: Store): RequestHandler {
  return async (req, _res, next) => {
    const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? "")?.[1];
    if (!token) throw new ApiException(401, "E_SESSION");
    const auth = await sessions.verify(token);
    const profile = await store.get<Profile>("profiles", auth.accountId);
    if (
      !profile ||
      profile.value.sessionVersion !== auth.sessionVersion ||
      profile.value.role !== auth.role ||
      profile.value.authMethod !== auth.authMethod
    )
      throw new ApiException(401, "E_SESSION");
    req.auth = auth;
    next();
  };
}
export function principal(req: Request): Principal {
  if (!req.auth) throw new ApiException(401, "E_SESSION");
  return req.auth;
}
export function roles(...accepted: Role[]): RequestHandler {
  return (req, _res, next) => {
    allowed(accepted.includes(principal(req).role));
    next();
  };
}
export function team(chain: Chain): RequestHandler {
  return async (req, _res, next) => {
    allowed(await chain.view<boolean>("is_member", { account_id: principal(req).accountId }));
    next();
  };
}
