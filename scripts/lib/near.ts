// Thin wrapper around near-cli-rs (`near`). Keys live in the OS keychain, which only the
// CLI can read, so the scripts call the CLI instead of a JavaScript SDK.

import spawn from "cross-spawn";

const NETWORK = "testnet";

function run(args: string[], quiet = false): { ok: boolean; stdout: string } {
  const result = spawn.sync("near", args, {
    encoding: "utf8",
    stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "" };
}

function must(args: string[], what: string): string {
  const { ok, stdout } = run(args);
  if (!ok) throw new Error(`Failed: ${what}`);
  return stdout;
}

export function accountExists(account: string): boolean {
  return run(["account", "view-account-summary", account, "network-config", NETWORK, "now"], true)
    .ok;
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

/** Calls a view method. Returns the parsed JSON, or undefined when the call fails. */
export function view<T>(contract: string, method: string, args: object = {}): T | undefined {
  const { ok, stdout } = run(
    [
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
    ],
    true,
  );
  if (!ok || !stdout.trim()) return undefined;
  return JSON.parse(stdout) as T;
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
