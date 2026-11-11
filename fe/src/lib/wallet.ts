import type { NearConnector, NearWalletBase, SignMessageParams } from "@hot-labs/near-connect";
import type { ChallengeResponse, SessionResponse } from "@waybil/shared";
import { api } from "./api";
import { NEAR_NETWORK, USDC_CONTRACT } from "./env";
import { view } from "./near";

/*
 * NEAR wallet for shippers, investors and the team (near-connect). Drivers and warehouses
 * never get here: their actions go through the relayer.
 */

let connector: Promise<NearConnector> | null = null;
/** One connector per tab, created in the browser on first use. */
function getConnector() {
  connector ??= import("@hot-labs/near-connect").then(
    ({ NearConnector }) =>
      new NearConnector({
        network: NEAR_NETWORK === "mainnet" ? "mainnet" : "testnet",
        features: { signMessage: true },
      }),
  );
  return connector;
}

/** Opens the wallet picker and returns the connected wallet and account. */
export async function connectWallet() {
  const wallet = await (await getConnector()).connect();
  const [account] = await wallet.getAccounts();
  if (!account) throw new Error("The wallet returned no account");
  return { wallet, accountId: account.accountId };
}

/** The wallet connected earlier in this browser, if there is one. */
async function connectedWallet() {
  return (await (await getConnector()).getConnectedWallet()).wallet;
}

export async function disconnectWallet() {
  try {
    await (await getConnector()).disconnect();
  } catch {
    /* Nothing was connected. */
  }
}

/**
 * Signs in with NEP-413: get a challenge, have the wallet sign it, trade it for a session.
 * The server checks `{ nonce, message, recipient, callbackUrl }`, so callbackUrl must be
 * signed too. `role` is only needed the first time (the server answers E_ROLE_REQUIRED).
 */
export async function walletSignIn(
  wallet: NearWalletBase,
  accountId: string,
  role?: "shipper" | "investor",
): Promise<SessionResponse> {
  const challenge = await api<ChallengeResponse>("/auth/challenge", {
    body: { kind: "wallet", accountId, ...(role && { role }) },
  });
  const signed = await wallet.signMessage({
    message: challenge.message,
    recipient: challenge.recipient,
    nonce: base64ToBytes(challenge.nonce),
    callbackUrl: challenge.callbackUrl,
    signerId: accountId,
  } as SignMessageParams);
  return api<SessionResponse>("/auth/wallet", {
    body: {
      challengeId: challenge.id,
      accountId,
      publicKey: signed.publicKey,
      signature: toBase64Signature(signed.signature),
      nonce: challenge.nonce,
    },
  });
}

/**
 * Sends one function call from the connected wallet and returns the transaction hash.
 * `deposit` is in yoctoNEAR.
 */
export async function callContract(
  receiverId: string,
  methodName: string,
  args: object,
  { deposit = "0", gas = "30000000000000" }: { deposit?: string; gas?: string } = {},
) {
  const wallet = await connectedWallet();
  const outcome = await wallet.signAndSendTransaction({
    receiverId,
    actions: [{ type: "FunctionCall", params: { methodName, args, gas, deposit } }],
  });
  return outcome.transaction.hash as string;
}

/**
 * Registers USDC storage before a wallet user's first transfer. The backend only registers
 * Google accounts. Returns the transaction hash, or null when it was already registered.
 */
export async function ensureUsdcStorage(accountId: string) {
  const balance = await view<object | null>(
    "storage_balance_of",
    { account_id: accountId },
    USDC_CONTRACT,
  );
  if (balance) return null;
  const { min } = await view<{ min: string }>("storage_balance_bounds", {}, USDC_CONTRACT);
  return callContract(
    USDC_CONTRACT,
    "storage_deposit",
    { account_id: accountId, registration_only: true },
    { deposit: min },
  );
}

export function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58ToBytes(value: string) {
  let n = 0n;
  for (const c of value) {
    const digit = BASE58.indexOf(c);
    if (digit < 0) throw new Error("Not base58");
    n = n * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  for (; n > 0n; n >>= 8n) bytes.unshift(Number(n & 255n));
  for (const c of value) {
    if (c !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

/**
 * The server wants the 64-byte signature as base64 (88 characters ending in "=="). Wallets
 * answer in base64, base58, or base58 with an "ed25519:" prefix.
 */
export function toBase64Signature(signature: string) {
  const raw = signature.replace(/^ed25519:/, "");
  if (/^[A-Za-z0-9+/]{86}==$/.test(raw)) return raw;
  return btoa(String.fromCharCode(...base58ToBytes(raw)));
}
