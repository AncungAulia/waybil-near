import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const secret = optional(z.string().min(1));
export const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(0).max(65535).default(4000),
    NEAR_NETWORK: z.literal("testnet").default("testnet"),
    NEAR_RPC_URL: z.url().default("https://rpc.testnet.near.org"),
    WAYBIL_CONTRACT: z.literal("app.waybil.testnet").default("app.waybil.testnet"),
    USDC_CONTRACT: z.literal("usdc.waybil.testnet").default("usdc.waybil.testnet"),
    APP_URL: z.url().default("http://localhost:3001"),
    CORS_ORIGINS: z.string().default("http://localhost:3001"),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
    JWT_ISSUER: z.string().default("waybil-api"),
    JWT_AUDIENCE: z.string().default("waybil-app"),
    JWT_SECRET: optional(z.string().min(32)),
    SUPABASE_URL: optional(z.url()),
    SUPABASE_SERVICE_ROLE_KEY: secret,
    RELAYER_ACCOUNT: z.string().default("relayer.waybil.testnet"),
    RELAYER_PRIVATE_KEY: secret,
    USERS_ACCOUNT: z.literal("users.waybil.testnet").default("users.waybil.testnet"),
    USERS_PRIVATE_KEY: secret,
    ASSISTANT_ACCOUNT: z.string().default("assistant.waybil.testnet"),
    ASSISTANT_PRIVATE_KEY: secret,
    GOOGLE_CLIENT_ID: secret,
    RECOVERY_ENCRYPTION_KEY: optional(
      z.string().refine((v) => Buffer.from(v, "base64").length === 32),
    ),
    GOOGLE_ACCOUNT_NAMES: z
      .string()
      .refine((v) => {
        try {
          return z
            .record(
              z.string().regex(/^[a-f0-9]{64}$/),
              z
                .string()
                .max(40)
                .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            )
            .safeParse(JSON.parse(v)).success;
        } catch {
          return false;
        }
      })
      .default("{}"),
    NEAR_AI_API_KEY: secret,
    NEAR_AI_MODEL: secret,
    NEAR_AI_TRUSTED_SIGNERS_JSON: z.string().default("[]"),
    CREDIT_POLICY_JSON: z.string().default(""),
    CREDIT_AUTO_LIMITS: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    CREDIT_WORKER_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    EMAIL_API_KEY: secret,
    EMAIL_FROM: optional(z.email()),
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.SUPABASE_URL) !== Boolean(v.SUPABASE_SERVICE_ROLE_KEY))
      ctx.addIssue({ code: "custom", message: "Configure both Supabase values." });
    if (v.CORS_ORIGINS.split(",").some((s) => !z.url().safeParse(s.trim()).success))
      ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "Use explicit origins." });
  });
export type Env = z.infer<typeof envSchema>;
export function readEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const values = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== ""));
  return envSchema.parse(values);
}
