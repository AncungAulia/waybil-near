import { expect, test } from "vitest";
import { toBase58 } from "./relay";
import { toBase64Signature } from "./wallet";

test("toBase58 keeps leading zeros and matches the wallet's decoder", () => {
  expect(toBase58(new Uint8Array(32))).toBe("1".repeat(32));
  expect(toBase58(Uint8Array.from([0, 0, 1]))).toBe("112");
  const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * 37) % 256);
  /* toBase64Signature decodes base58, so a round trip gives the same bytes back. */
  expect(toBase64Signature(toBase58(bytes))).toBe(btoa(String.fromCharCode(...bytes)));
});
