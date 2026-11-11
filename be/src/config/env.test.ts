import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

describe("runtime configuration", () => {
  const production = {
    NODE_ENV: "production",
    JWT_SECRET: "s".repeat(32),
    SUPABASE_URL: "https://database.example.com",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    RECOVERY_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
    GOOGLE_CLIENT_ID: "test",
    RELAYER_PRIVATE_KEY: "test",
    USERS_PRIVATE_KEY: "test",
    APP_URL: "https://app.example.com",
    CORS_ORIGINS: "https://app.example.com/",
    TRUST_PROXY_HOPS: "1",
  };
  it("requires explicit production secrets and deployment settings", () => {
    expect(() => readEnv({ NODE_ENV: "production" })).toThrow("Missing production configuration");
    for (const key of Object.keys(production).filter((k) => k !== "NODE_ENV")) {
      const values: NodeJS.ProcessEnv = { ...production };
      delete values[key];
      expect(() => readEnv(values), key).toThrow();
    }
    expect(readEnv(production).CORS_ORIGINS).toBe("https://app.example.com");
    expect(() => readEnv({ ...production, APP_URL: "http://localhost:3001" })).toThrow();
    expect(() => readEnv({ ...production, CORS_ORIGINS: "http://example.com" })).toThrow();
  });
});
