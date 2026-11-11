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

/** Signs bytes with the device key (used by the relay in #85). */
export async function signWithDevice(bytes: Uint8Array) {
  const key = await deviceKey();
  return new Uint8Array(
    await crypto.subtle.sign("Ed25519", key.privateKey, bytes as Uint8Array<ArrayBuffer>),
  );
}
