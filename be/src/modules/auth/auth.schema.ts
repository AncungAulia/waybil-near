import { z } from "zod";
import { accountId } from "../../middlewares/validate";
const publicKey = z.string().regex(/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const nonce = z.string().regex(/^[A-Za-z0-9+/]{43}=$/);
export const challengeRequest = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("wallet"),
      accountId,
      role: z.enum(["shipper", "investor"]).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("google"),
      publicKey,
      inviteCode: z
        .string()
        .regex(/^[a-f0-9]{24}$/)
        .optional(),
    })
    .strict(),
]);
export const walletLogin = z
  .object({
    challengeId: z.uuid(),
    accountId,
    publicKey,
    signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/),
    nonce,
  })
  .strict();
export const googleLogin = z
  .object({ challengeId: z.uuid(), idToken: z.string().min(20).max(8192) })
  .strict();
export const profileUpdate = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/)
      .optional(),
    email: z.email().max(254).optional(),
    truckPlate: z
      .string()
      .trim()
      .regex(/^[A-Z]{1,4}-\d{1,5}$/)
      .nullable()
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
