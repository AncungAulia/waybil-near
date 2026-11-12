import { HTTP_ERRORS, type RelayResponse } from "@waybil/shared";
import { api, ApiError } from "./api";
import { WAYBIL_CONTRACT } from "./env";
import { accessKey } from "./near";
import { base58ToBytes } from "./wallet";

/*
 * The phone's device key for drivers and warehouses (Google sign-in). It signs their
 * confirmations, which the backend relays, so they never see a wallet or pay fees.
 *
 * The key is a WebCrypto Ed25519 key made non-extractable, kept in IndexedDB. The private
 * half never leaves the browser, not even to this code. Only the public key goes to the API.
 */

const DB = "waybil-device";
const STORE = "keys";
const ID = "device";

interface DeviceKey {
  privateKey: CryptoKey;
  /** `ed25519:<base58>`, the form the API and NEAR use. */
  publicKey: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const request = work(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function toBase58(bytes: Uint8Array) {
  let n = bytes.reduce((acc, b) => acc * 256n + BigInt(b), 0n);
  let out = "";
  for (; n > 0n; n /= 58n) out = BASE58[Number(n % 58n)] + out;
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

/** The stored device key, or null on a new phone or after storage was cleared. */
export async function readDeviceKey(): Promise<DeviceKey | null> {
  try {
    return ((await run("readonly", (s) => s.get(ID))) as DeviceKey | undefined) ?? null;
  } catch {
    return null;
  }
}

/** The device key, made on first use. Throws when the browser has no Ed25519 support. */
export async function deviceKey(): Promise<DeviceKey> {
  const stored = await readDeviceKey();
  if (stored) return stored;
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, false, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const key = { privateKey: pair.privateKey, publicKey: `ed25519:${toBase58(raw)}` };
  await run("readwrite", (s) => s.put(key, ID));
  return key;
}

/** Signs bytes with the device key. */
export async function signWithDevice(bytes: Uint8Array) {
  const key = await deviceKey();
  return new Uint8Array(
    await crypto.subtle.sign("Ed25519", key.privateKey, bytes as Uint8Array<ArrayBuffer>),
  );
}

/*
 * NEP-366 meta transactions. The device key signs a delegate action with one function call
 * to the main contract. The backend wraps it in a transaction it pays for.
 */

export interface DelegateAction {
  senderId: string;
  receiverId: string;
  methodName: "confirm_pickup" | "confirm_delivery";
  args: object;
  /** At most 100 Tgas, which the backend checks. */
  gas: bigint;
  nonce: bigint;
  maxBlockHeight: bigint;
  /** The 32 raw bytes of the device's ed25519 public key. */
  publicKey: Uint8Array;
}

/** Borsh, the way near-api-js writes a DelegateAction with one FunctionCall and no deposit. */
export function encodeDelegateAction(d: DelegateAction) {
  const out: number[] = [];
  const u32 = (n: number) => out.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, n >>> 24);
  const uint = (n: bigint, size: number) => {
    for (let i = 0; i < size; i++, n >>= 8n) out.push(Number(n & 255n));
  };
  const bytes = (b: Uint8Array) => {
    u32(b.length);
    out.push(...b);
  };
  const text = (s: string) => bytes(new TextEncoder().encode(s));
  text(d.senderId);
  text(d.receiverId);
  u32(1); // one action
  out.push(2); // Action::FunctionCall
  text(d.methodName);
  bytes(new TextEncoder().encode(JSON.stringify(d.args)));
  uint(d.gas, 8);
  uint(0n, 16); // deposit
  uint(d.nonce, 8);
  uint(d.maxBlockHeight, 8);
  out.push(0, ...d.publicKey); // KeyType::ED25519
  return Uint8Array.from(out);
}

/** NEP-461 prefix for delegate actions: 2^30 + 366, as a little-endian u32. */
const DELEGATE_PREFIX = Uint8Array.from([110, 1, 0, 64]);

/** The SignedDelegate bytes, base64, ready for `POST /v1/relay`. */
export async function signDelegate(d: DelegateAction) {
  const encoded = encodeDelegateAction(d);
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from([...DELEGATE_PREFIX, ...encoded])),
  );
  const signature = await signWithDevice(hash);
  return btoa(String.fromCharCode(...encoded, 0, ...signature));
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Signs one call with the device key and has the backend relay it. Drivers and warehouses
 * see no wallet and pay no fees. Waits until the transaction is final.
 */
export async function relay(
  senderId: string,
  methodName: DelegateAction["methodName"],
  args: object,
  /** The code the driver showed, which a delivery confirmation must carry. */
  arrivalCode?: string,
): Promise<RelayResponse> {
  const key = await deviceKey();
  const publicKey = base58ToBytes(key.publicKey.replace(/^ed25519:/, ""));
  const build = async () => {
    const access = await accessKey(senderId, key.publicKey);
    return signDelegate({
      senderId,
      receiverId: WAYBIL_CONTRACT,
      methodName,
      args,
      gas: 100000000000000n,
      nonce: BigInt(access.nonce) + 1n,
      /* The backend allows up to 200 blocks ahead, about three minutes. */
      maxBlockHeight: BigInt(access.block_height) + 150n,
      publicKey,
    });
  };
  let signedDelegate = await build();
  let rebuilt = false;
  for (let tries = 0; tries < 40; tries++) {
    try {
      const result = await api<RelayResponse>("/relay", {
        body: { signedDelegate, ...(arrivalCode && { arrivalCode }) },
      });
      if (result.status !== "pending") return result;
      /* There is no status GET. Sending the same delegate again is safe and reports it. */
      await wait(2000);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === "E_DELEGATE_EXPIRED" && !rebuilt) {
        rebuilt = true;
        signedDelegate = await build();
      } else if (error.code === "E_SIGNER_BUSY" || error.code === "E_RELAY_PENDING") {
        await wait(2500);
      } else throw error;
    }
  }
  throw new ApiError(503, "E_RELAY_PENDING", HTTP_ERRORS.E_RELAY_PENDING);
}

/*
 * The arrival code is random and kept by the backend (docs/specs/backend-api.md, "Arrival
 * codes"). This only tidies what a person typed or scanned: upper case, no spaces, and the
 * 8 characters the backend uses (no 0, 1, I, L or O). Anything else is null.
 */
export function cleanArrivalCode(value: string) {
  const code = value.replace(/\s+/g, "").toUpperCase();
  return /^[2-9A-HJ-KM-NP-Z]{8}$/.test(code) ? code : null;
}
