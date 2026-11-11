// Upgrades app.waybil.testnet through a 2-of-3 team vote (docs/specs/contract.md, Upgrades;
// decision 0012). The proposer proposes the hash of the new wasm, then the approver sends the
// wasm with the second approval. The contract checks the hash, deploys the code to itself and
// calls migrate in one batch. If migrate fails, the old code stays.
//
//   pnpm --filter @waybil/scripts team-upgrade --wasm <path> \
//     --proposer risk.waybil.testnet --approver ops.waybil.testnet
//
// Safe to run again: an open upgrade proposal with the same hash is reused, and nothing is
// sent when the contract already runs this code. Both keys must be in the keychain.
// Build the wasm from the tagged commit first (`cargo near build`), so the other members
// can check the hash.

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { call, callWithFile, view } from "./lib/near.js";

const APP = "app.waybil.testnet";

interface CodeInfo {
  version: number;
  code_hash: string | null;
}
interface Proposal {
  id: number;
  kind: Record<string, { code_hash?: string }>;
  by: string;
  status: string;
}

function step(text: string) {
  console.log(`\n▸ ${text}`);
}

function option(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const value = i >= 0 ? process.argv[i + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error("Usage: team-upgrade --wasm <path> --proposer <member> --approver <member>");
  }
  return value;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Base58 (Bitcoin alphabet), the encoding of NEAR hashes. */
function base58(bytes: Uint8Array): string {
  let n = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = `1${out}`;
  }
  return out;
}

/** Input of `approve_upgrade`: borsh `(id: u64, code: Vec<u8>)`. */
function upgradeArgs(id: number, wasm: Buffer): Buffer {
  const head = Buffer.alloc(12);
  head.writeBigUInt64LE(BigInt(id), 0);
  head.writeUInt32LE(wasm.length, 8);
  return Buffer.concat([head, wasm]);
}

function openUpgrade(hash: string): Proposal | undefined {
  const open = view<Proposal[]>(APP, "list_proposals", { status: "Open" });
  return open.find((p) => p.kind.Upgrade?.code_hash === hash);
}

function main() {
  const wasmPath = resolve(option("wasm"));
  const proposer = option("proposer");
  const approver = option("approver");
  if (!existsSync(wasmPath)) throw new Error(`No wasm at ${wasmPath}`);
  if (proposer === approver) throw new Error("The proposer and the approver must differ.");

  const wasm = readFileSync(wasmPath);
  const hash = base58(createHash("sha256").update(wasm).digest());
  step("New code");
  console.log(`  ${wasmPath}`);
  console.log(`  ${(wasm.length / 1024).toFixed(0)} KB, sha256 ${hash}`);

  const before = view<CodeInfo>(APP, "get_code_info");
  console.log(`  running now: version ${before.version}, code ${before.code_hash ?? "unknown"}`);
  if (before.code_hash === hash) {
    console.log("\nThe contract already runs this code. Nothing to do.");
    return;
  }
  for (const member of [proposer, approver]) {
    if (!view<boolean>(APP, "is_member", { account_id: member })) {
      throw new Error(`${member} is not a team member.`);
    }
  }

  step("Proposal");
  let proposal = openUpgrade(hash);
  if (proposal) {
    console.log(`  reusing open proposal #${proposal.id} by ${proposal.by}`);
  } else {
    call(APP, "propose", { kind: { Upgrade: { code_hash: hash } } }, proposer);
    proposal = openUpgrade(hash);
    if (!proposal) throw new Error("The proposal was sent but can't be found.");
    console.log(`  ${proposer} proposed #${proposal.id}`);
  }

  step(`Approval by ${approver} with the code`);
  const dir = mkdtempSync(join(tmpdir(), "waybil-upgrade-"));
  const argsFile = join(dir, "approve_upgrade.bin");
  writeFileSync(argsFile, upgradeArgs(proposal.id, wasm));
  let failure: Error | undefined;
  try {
    callWithFile(APP, "approve_upgrade", argsFile, approver);
  } catch (e) {
    failure = e as Error;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  step("Check");
  const after = view<CodeInfo>(APP, "get_code_info");
  console.log(`  version ${after.version}, code ${after.code_hash ?? "unknown"}`);
  if (after.code_hash !== hash) {
    throw new Error(
      `The upgrade did not go through${failure ? ` (${failure.message})` : ""}. ` +
        "The old code still runs. If migrate failed, propose fixed code.",
    );
  }
  console.log(`\nDone. See https://testnet.nearblocks.io/address/${APP}`);
}

try {
  main();
} catch (e) {
  console.error(`\n✖ ${(e as Error).message}`);
  process.exit(1);
}
