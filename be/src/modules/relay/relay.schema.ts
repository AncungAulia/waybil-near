import { z } from "zod";
import { deserialize } from "borsh";
import {
  actions,
  DelegateAction,
  PublicKey,
  Signature,
  type SignedDelegate,
  SCHEMA,
  encodeSignedDelegate,
} from "near-api-js";
import { parse, accountId } from "../../middlewares/validate";
import { ApiException } from "../../lib/errors";

export const relayRequest = z.object({ signedDelegate: z.string().min(4).max(22000) }).strict();
const chainId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const pickupArgs = z.object({ id: chainId }).strict();
export const deliveryArgs = z
  .object({
    id: chainId,
    good_qty: z.number().int().min(0).max(4294967295),
    report_hash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
  })
  .strict();
const bytes = (length: number) => z.array(z.number().int().min(0).max(255)).length(length);
const rawSchema = z
  .object({
    delegateAction: z
      .object({
        senderId: accountId,
        receiverId: accountId,
        actions: z
          .array(
            z
              .object({
                functionCall: z
                  .object({
                    methodName: z.enum(["confirm_pickup", "confirm_delivery"]),
                    args: z.array(z.number().int().min(0).max(255)).max(4096),
                    gas: z.bigint().positive().max(100000000000000n),
                    deposit: z.literal(0n),
                  })
                  .strict(),
              })
              .strict(),
          )
          .length(1),
        nonce: z.bigint().positive(),
        maxBlockHeight: z.bigint().positive(),
        publicKey: z.object({ ed25519Key: z.object({ data: bytes(32) }).strict() }).strict(),
      })
      .strict(),
    signature: z.object({ ed25519Signature: z.object({ data: bytes(64) }).strict() }).strict(),
  })
  .strict();
export function decodeDelegate(encoded: string): SignedDelegate {
  try {
    const buffer = Buffer.from(encoded, "base64");
    if (buffer.length > 16384 || buffer.toString("base64") !== encoded) throw new Error();
    const raw = parse(rawSchema, deserialize(SCHEMA.SignedDelegate, buffer));
    const d = raw.delegateAction;
    const signed: SignedDelegate = {
      delegateAction: new DelegateAction({
        ...d,
        actions: d.actions.map(({ functionCall: call }) =>
          actions.functionCall(call.methodName, Uint8Array.from(call.args), call.gas, call.deposit),
        ),
        publicKey: new PublicKey({
          keyType: 0,
          data: Uint8Array.from(d.publicKey.ed25519Key.data),
        }),
      }),
      signature: new Signature({
        keyType: 0,
        data: Uint8Array.from(raw.signature.ed25519Signature.data),
      }),
    };
    if (!Buffer.from(encodeSignedDelegate(signed)).equals(buffer)) throw new Error();
    return signed;
  } catch {
    throw new ApiException(
      400,
      "E_DELEGATE",
      "This delivery request could not be read. Please try again.",
    );
  }
}
