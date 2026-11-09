import { SignJWT, jwtVerify } from "jose";
import type { Principal, Profile } from "@waybil/shared";
import type { Env } from "../config/env";
import { ApiException, unavailable } from "./errors";

export class Sessions {
  constructor(private env: Env) {}
  async issue(profile: Profile) {
    const expires = Math.floor(Date.now() / 1000) + 7 * 86400;
    const token = await new SignJWT({
      role: profile.role,
      authMethod: profile.authMethod,
      sessionVersion: profile.sessionVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(profile.accountId)
      .setIssuer(this.env.JWT_ISSUER)
      .setAudience(this.env.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(this.key());
    return { token, expiresAt: new Date(expires * 1000).toISOString(), profile };
  }
  async verify(token: string): Promise<Principal> {
    const key = this.key();
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["HS256"],
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
        requiredClaims: ["sub", "exp", "iat"],
      });
      if (
        typeof payload.sub !== "string" ||
        !["shipper", "driver", "warehouse", "investor", "admin"].includes(String(payload.role)) ||
        !["wallet", "google"].includes(String(payload.authMethod)) ||
        !Number.isSafeInteger(payload.sessionVersion)
      )
        throw new Error();
      return {
        accountId: payload.sub,
        role: payload.role as Principal["role"],
        authMethod: payload.authMethod as Principal["authMethod"],
        sessionVersion: payload.sessionVersion as number,
      };
    } catch {
      throw new ApiException(401, "E_SESSION");
    }
  }
  private key() {
    return this.env.JWT_SECRET
      ? new TextEncoder().encode(String(this.env.JWT_SECRET))
      : unavailable();
  }
}
