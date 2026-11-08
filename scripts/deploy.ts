// Creates the Waybil testnet accounts and deploys the contracts (issue #12).
// Safe to run again: existing accounts are skipped, and an initialized contract only gets
// its new code. Keys are saved to and read from the OS keychain by near-cli-rs.
//
//   pnpm --filter @waybil/scripts deploy-contracts             build, then deploy
//   pnpm --filter @waybil/scripts deploy-contracts --no-build  deploy the wasm already built
//
// A code update must keep the stored state compatible. If the state layout changed, deploy
// to a fresh account or add a migration (docs/specs/contract.md, Upgrades).

import spawn from "cross-spawn";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { accountExists, call, createAccount, deploy, view } from "./lib/near.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT = "waybil.testnet";
const USDC = `usdc.${PARENT}`;
const APP = `app.${PARENT}`;
const TEAM = [`risk.${PARENT}`, `ops.${PARENT}`, `finance.${PARENT}`];

/** Accounts from docs/ARCHITECTURE.md and their starting balance in NEAR. */
const ACCOUNTS: [string, string][] = [
  [APP, "3.5"],
  [`relayer.${PARENT}`, "1"],
  [`assistant.${PARENT}`, "0.3"],
  [`treasury.${PARENT}`, "0.2"],
  ...TEAM.map((a): [string, string] => [a, "0.2"]),
];

/** Accounts that receive test USDC from the contract and need token storage. */
const TOKEN_HOLDERS = [APP, `treasury.${PARENT}`];

function step(text: string) {
  console.log(`\n▸ ${text}`);
}

function build() {
  step("Building the waybil contract");
  const r = spawn.sync("cargo", ["near", "build", "non-reproducible-wasm", "--no-abi"], {
    cwd: resolve(ROOT, "contracts/waybil"),
    stdio: "inherit",
    env: { ...process.env, CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "2" },
  });
  if (r.status !== 0) throw new Error("Build failed");
}

function main() {
  if (!accountExists(USDC)) throw new Error(`${USDC} is missing. Deploy mock-usdc first.`);
  if (!process.argv.includes("--no-build")) build();
  const wasm = resolve(ROOT, "contracts/waybil/target/near/waybil.wasm");
  if (!existsSync(wasm)) throw new Error(`No wasm at ${wasm}. Run without --no-build.`);

  step("Accounts");
  for (const [account, near] of ACCOUNTS) {
    if (accountExists(account)) {
      console.log(`  ${account} exists`);
    } else {
      console.log(`  creating ${account} with ${near} NEAR`);
      createAccount(account, PARENT, near);
    }
  }

  step(`Contract ${APP}`);
  const initialized = view(APP, "get_config") !== undefined;
  if (initialized) {
    console.log("  already initialized, updating the code only");
    deploy(APP, wasm);
  } else {
    console.log("  first deploy, calling new()");
    deploy(APP, wasm, {
      method: "new",
      args: {
        usdc: USDC,
        assistant: `assistant.${PARENT}`,
        treasury: `treasury.${PARENT}`,
        team: TEAM,
      },
    });
  }

  step("Token storage on test USDC");
  for (const account of TOKEN_HOLDERS) {
    if (view(USDC, "storage_balance_of", { account_id: account })) {
      console.log(`  ${account} already registered`);
    } else {
      console.log(`  registering ${account}`);
      call(USDC, "storage_deposit", { account_id: account }, PARENT, "0.00125 NEAR", "30 Tgas");
    }
  }

  step("Check");
  console.log("  team:", JSON.stringify(view(APP, "get_team")));
  console.log("  pool:", JSON.stringify(view(APP, "get_pool")));
  console.log(`\nDone. See https://testnet.nearblocks.io/address/${APP}`);
}

try {
  main();
} catch (e) {
  console.error(`\n✖ ${(e as Error).message}`);
  process.exit(1);
}
