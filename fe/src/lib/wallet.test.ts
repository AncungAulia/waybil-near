import { expect, test } from "vitest";
import { base64ToBytes, toBase64Signature } from "./wallet";

/* 64 bytes 0..63 in each format a wallet may answer with. */
const bytes = Uint8Array.from({ length: 64 }, (_, i) => i);
const base64 = btoa(String.fromCharCode(...bytes));
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function toBase58(input: Uint8Array) {
  let n = input.reduce((acc, b) => acc * 256n + BigInt(b), 0n);
  let out = "";
  for (; n > 0n; n /= 58n) out = BASE58[Number(n % 58n)] + out;
  for (const b of input) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

test("toBase64Signature gives the 88-character base64 the server checks", () => {
  expect(base64).toMatch(/^[A-Za-z0-9+/]{86}==$/);
  expect(toBase64Signature(base64)).toBe(base64);
  expect(toBase64Signature(toBase58(bytes))).toBe(base64);
  expect(toBase64Signature(`ed25519:${toBase58(bytes)}`)).toBe(base64);
});

test("base64ToBytes decodes the challenge nonce to 32 bytes", () => {
  const nonce = btoa(String.fromCharCode(...Array(32).fill(7)));
  expect(base64ToBytes(nonce)).toEqual(new Uint8Array(32).fill(7));
});
