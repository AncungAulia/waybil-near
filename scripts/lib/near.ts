// Thin wrapper around near-cli-rs (`near`). Keys live in the OS keychain, which only the
// CLI can read, so the scripts call the CLI instead of a JavaScript SDK.

import spawn from "cross-spawn";

const NETWORK = "testnet";

/** Pause between calls so the public RPC doesn't rate-limit the scripts. */
const PAUSE_MS = 400;

interface Result {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function run(args: string[], quiet = false): Result {
  sleep(PAUSE_MS);
  const result = spawn.sync("near", args, {
    encoding: "utf8",
    stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const isRateLimited = (r: Result) => /rate limit|too many requests/i.test(r.stderr);

/**
 * Runs a read-only command, retrying when the RPC rate-limits it.
 * Only for reads: transactions are never retried, so nothing is sent twice.
 */
function read(args: string[]): Result {
  let r = run(args, true);
  for (let i = 0; i < 5 && !r.ok && isRateLimited(r); i++) {
    sleep(3_000 * (i + 1));
    r = run(args, true);
  }
  return r;
}

function must(args: string[], what: string): string {
  const { ok, stdout } = run(args);
  if (!ok) throw new Error(`Failed: ${what}`);
  return stdout;
}

/** True or false only when the chain says so. Any other failure throws. */
export function accountExists(account: string): boolean {
  const r = read(["account", "view-account-summary", account, "network-config", NETWORK, "now"]);
  if (r.ok) return true;
  if (/does not exist/i.test(r.stderr)) return false;
  throw new Error(`Could not check ${account}. Try again in a minute.`);
}

/** Creates `account` funded by its parent `parent`, with a new key saved to the keychain. */
export function createAccount(account: string, parent: string, near: string): void {
  must(
    [
      "account",
      "create-account",
      "fund-myself",
      account,
      `${near} NEAR`,
      "autogenerate-new-keypair",
      "save-to-keychain",
      "sign-as",
      parent,
      "network-config",
      NETWORK,
      "sign-with-keychain",
      "send",
    ],
    `create ${account}`,
  );
}

/**
 * Creates a top-level testnet account through the testnet faucet, like a new wallet would.
 * The faucet funds it with test NEAR. The CLI sometimes reports an error even when the
 * account was made, and the account can take a few seconds to show up, so this waits and
 * checks the chain instead of trusting the exit code. Never retry the faucet call itself:
 * a retry saves an extra unused key to the keychain.
 */
export function createFaucetAccount(account: string): void {
  run(
    [
      "account",
      "create-account",
      "sponsor-by-faucet-service",
      account,
      "autogenerate-new-keypair",
      "save-to-keychain",
      "network-config",
      NETWORK,
      "create",
    ],
    true,
  );
  for (let i = 0; i < 10; i++) {
    if (accountExists(account)) return;
    sleep(3_000);
  }
  throw new Error(`Faucet could not create ${account}`);
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Calls a view method. Returns the parsed JSON, or undefined when the call fails. */
function readView(contract: string, method: string, args: object): Result {
  return read([
    "contract",
    "call-function",
    "as-read-only",
    contract,
    method,
    "json-args",
    JSON.stringify(args),
    "network-config",
    NETWORK,
    "now",
  ]);
}

/**
 * Calls a view method and returns its JSON (which may be `null`).
 * Throws when the call fails, so a flaky RPC never looks like "no data".
 */
export function view<T>(contract: string, method: string, args: object = {}): T {
  const r = readView(contract, method, args);
  if (!r.ok || !r.stdout.trim()) {
    throw new Error(`Could not read ${method} on ${contract}. Try again in a minute.`);
  }
  return JSON.parse(r.stdout) as T;
}

/**
 * Like `view`, but returns undefined when the contract itself can't answer
 * (for example it is not initialized yet). Still throws when the RPC is rate-limited.
 */
export function tryView<T>(contract: string, method: string, args: object = {}): T | undefined {
  const r = readView(contract, method, args);
  if (r.ok && r.stdout.trim()) return JSON.parse(r.stdout) as T;
  if (isRateLimited(r)) throw new Error(`The RPC is busy. Try again in a minute.`);
  return undefined;
}

/** Sends a function call signed by `signer` from the keychain. */
export function call(
  contract: string,
  method: string,
  args: object,
  signer: string,
  deposit = "0 NEAR",
  gas = "100 Tgas",
): void {
  must(
    [
      "contract",
      "call-function",
      "as-transaction",
      contract,
      method,
      "json-args",
      JSON.stringify(args),
      "prepaid-gas",
      gas,
      "attached-deposit",
      deposit,
      "sign-as",
      signer,
      "network-config",
      NETWORK,
      "sign-with-keychain",
      "send",
    ],
    `${method} on ${contract}`,
  );
}

/**
 * Sends a function call whose input is the raw bytes of `file` (not JSON), signed by
 * `signer` from the keychain. Used for `approve_upgrade`, which takes the new wasm.
 */
export function callWithFile(
  contract: string,
  method: string,
  file: string,
  signer: string,
  gas = "300 Tgas",
): void {
  must(
    [
      "contract",
      "call-function",
      "as-transaction",
      contract,
      method,
      "file-args",
      file,
      "prepaid-gas",
      gas,
      "attached-deposit",
      "0 NEAR",
      "sign-as",
      signer,
      "network-config",
      NETWORK,
      "sign-with-keychain",
      "send",
    ],
    `${method} on ${contract}`,
  );
}

/** Deploys a wasm. With `init`, also calls the init method in the same transaction. */
export function deploy(
  account: string,
  wasm: string,
  init?: { method: string; args: object },
): void {
  const tail = ["network-config", NETWORK, "sign-with-keychain", "send"];
  const initArgs = init
    ? [
        "with-init-call",
        init.method,
        "json-args",
        JSON.stringify(init.args),
        "prepaid-gas",
        "100 Tgas",
        "attached-deposit",
        "0 NEAR",
      ]
    : ["without-init-call"];
  must(
    ["contract", "deploy", account, "use-file", wasm, ...initArgs, ...tail],
    `deploy ${account}`,
  );
}
