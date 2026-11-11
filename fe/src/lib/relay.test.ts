import { expect, test } from "vitest";
import { arrivalCode, encodeDelegateAction, shipmentFromCode, toBase58 } from "./relay";

test("encodeDelegateAction matches near-api-js byte for byte", () => {
  /* near-api-js' encodeDelegateAction for the same fields, which starts with the NEP-461
     prefix 6e010040. The backend hashes exactly that, so signDelegate adds the prefix too. */
  const expected =
    "6e0100401800000073616d2e75736572732e77617962696c2e746573746e6574120000006170702e77617962696c2e746573746e657401000000020e000000636f6e6669726d5f7069636b7570080000007b226964223a377d00407a10f35a0000000000000000000000000000000000002a00000000000000e803000000000000000707070707070707070707070707070707070707070707070707070707070707";
  const bytes = encodeDelegateAction({
    senderId: "sam.users.waybil.testnet",
    receiverId: "app.waybil.testnet",
    methodName: "confirm_pickup",
    args: { id: 7 },
    gas: 100000000000000n,
    nonce: 42n,
    maxBlockHeight: 1000n,
    publicKey: new Uint8Array(32).fill(7),
  });
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  expect(`6e010040${hex}`).toBe(expected);
});
import { toBase64Signature } from "./wallet";

test("toBase58 keeps leading zeros and matches the wallet's decoder", () => {
  expect(toBase58(new Uint8Array(32))).toBe("1".repeat(32));
  expect(toBase58(Uint8Array.from([0, 0, 1]))).toBe("112");
  const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * 37) % 256);
  /* toBase64Signature decodes base58, so a round trip gives the same bytes back. */
  expect(toBase64Signature(toBase58(bytes))).toBe(btoa(String.fromCharCode(...bytes)));
});

test("the arrival code is the shipment id in base 36 and reads back", () => {
  expect(arrivalCode(1041)).toBe("000000SX");
  expect(shipmentFromCode(" 000000sx ")).toBe(1041);
  expect(shipmentFromCode("7K2Q9F4")).toBeNull();
  expect(shipmentFromCode("00000000")).toBeNull();
});
