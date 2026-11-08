// Builds the ABI of each contract and copies it to contracts/<name>/abi/<name>.json,
// where fe and be read it. CI checks that the committed files are up to date.
//
//   pnpm --filter @waybil/scripts abi

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import spawn from "cross-spawn";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACTS = ["waybil", "mock-usdc"];

// The ABI build links the contract as a native library. MSVC refuses to leave the NEAR
// host functions unresolved, though they are never called while reading the ABI.
const env =
  process.platform === "win32"
    ? { ...process.env, RUSTFLAGS: "-C link-arg=/FORCE:UNRESOLVED" }
    : process.env;

for (const name of CONTRACTS) {
  const dir = join(ROOT, "contracts", name);
  console.log(`\n▸ ${name}`);
  const r = spawn.sync("cargo", ["near", "abi"], { cwd: dir, env, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`✖ Could not build the ABI of ${name}`);
    process.exit(1);
  }
  const out = join(dir, "abi", `${name}.json`);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(join(dir, "target", "near", `${name.replace(/-/g, "_")}_abi.json`), out);
  console.log(`  saved contracts/${name}/abi/${name}.json`);
}
