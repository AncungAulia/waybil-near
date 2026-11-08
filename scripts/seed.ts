// Seeds the demo story from docs/specs/demo-data.md onto testnet (issue #13).
// Safe to run again: every step checks the chain first and skips what is already done.
//
//   pnpm --filter @waybil/scripts seed
//
// Stage 1 (this file): demo wallets, the pool, team approvals, credit limits and
// Northwind's network. Stage 2 (after Google sign-in, #16): shipments with Sam and Lena.

import { accountExists, call, createFaucetAccount, view } from "./lib/near.js";

const PARENT = "waybil.testnet";
const USDC = `usdc.${PARENT}`;
const APP = `app.${PARENT}`;
const RISK = `risk.${PARENT}`;
const OPS = `ops.${PARENT}`;
const ASSISTANT = `assistant.${PARENT}`;

const ONE = 1_000_000n; // 1 USDC in base units
const usdc = (n: number) => (BigInt(n) * ONE).toString();

const NORTHWIND = "northwind-freight.testnet";
const BLUE_RIDGE = "blue-ridge-logistics.testnet";
const ATLAS = "atlas-cargo.testnet";
const MERIDIAN = "meridian-shipping.testnet";
const MAYA = "maya-harper.testnet";

/** Investors and what they put in. Maya deposits 5,500 and later takes 500 out. */
const INVESTORS: [string, number][] = [
  [MAYA, 5_500],
  ["orbit-ventures.testnet", 8_000],
  ["harbor-coop.testnet", 6_500],
  ["leo-moreau.testnet", 3_000],
  ["ana-silva.testnet", 2_500],
];

/** Wallets that would sign up by themselves. They are made through the testnet faucet. */
const WALLETS = [NORTHWIND, BLUE_RIDGE, ATLAS, ...INVESTORS.map(([a]) => a)];

/** Google accounts are made by the backend in #16. Their names are fixed here already. */
const SAM = "sam.users.waybil.testnet";
const JORDAN = "jordan.users.waybil.testnet";
const LENA = "lena.users.waybil.testnet";

interface Shipper {
  limit: string;
}
interface Investor {
  shares: string;
}
interface Proposal {
  id: number;
  kind: Record<string, { shipper?: string; limit?: string }>;
  status: string;
}
interface Network {
  drivers: string[];
  destinations: { warehouse: string }[];
}

function step(text: string) {
  console.log(`\n▸ ${text}`);
}

function openProposals(): Proposal[] {
  return view<Proposal[]>(APP, "list_proposals", { status: "Open", limit: 50 }) ?? [];
}

function findOpen(kind: string, shipper: string): Proposal | undefined {
  return openProposals().find((p) => p.kind[kind]?.shipper === shipper);
}

/** Team member `RISK` proposes, `OPS` approves: 2 of 3. */
function startShipper(shipper: string, limit: number) {
  if (view<Shipper | null>(APP, "get_shipper", { account_id: shipper })) {
    console.log(`  ${shipper} already active`);
    return;
  }
  let p = findOpen("StartShipper", shipper);
  if (!p) {
    call(APP, "propose", { kind: { StartShipper: { shipper, limit: usdc(limit) } } }, RISK);
    p = findOpen("StartShipper", shipper);
  }
  if (!p) throw new Error(`No open proposal for ${shipper}`);
  call(APP, "vote", { id: p.id, approve: true }, OPS);
  console.log(`  ${shipper} started with ${limit} USDC`);
}

function main() {
  if (!accountExists(APP)) throw new Error(`${APP} is missing. Run deploy-contracts first.`);

  step("Demo wallets (testnet faucet)");
  for (const account of WALLETS) {
    if (accountExists(account)) {
      console.log(`  ${account} exists`);
    } else {
      console.log(`  creating ${account}`);
      createFaucetAccount(account);
    }
  }

  step("Pool deposits");
  for (const [investor, amount] of INVESTORS) {
    const shares = BigInt(
      view<Investor>(APP, "get_investor", { account_id: investor })?.shares ?? "0",
    );
    if (shares > 0n) {
      console.log(`  ${investor} already in the pool`);
      continue;
    }
    call(USDC, "mint", { account_id: investor, amount: usdc(amount) }, PARENT, "0 NEAR", "30 Tgas");
    call(
      USDC,
      "ft_transfer_call",
      { receiver_id: APP, amount: usdc(amount), msg: "deposit" },
      investor,
      "1 yoctoNEAR",
      "100 Tgas",
    );
    console.log(`  ${investor} deposited ${amount} USDC`);
    if (investor === MAYA) {
      call(APP, "withdraw", { amount: usdc(500) }, MAYA);
      console.log(`  ${MAYA} withdrew 500 USDC`);
    }
  }

  step("Shippers approved by the team");
  startShipper(NORTHWIND, 2_500);
  startShipper(BLUE_RIDGE, 1_500);
  startShipper(ATLAS, 1_500);

  step("Northwind's credit");
  const northwind = view<Shipper>(APP, "get_shipper", { account_id: NORTHWIND });
  if (northwind && BigInt(northwind.limit) < BigInt(usdc(3_000))) {
    call(APP, "assistant_set_limit", { shipper: NORTHWIND, limit: usdc(3_000) }, ASSISTANT);
    console.log("  the assistant raised the limit to 3,000 USDC (+20%)");
  } else {
    console.log("  limit already 3,000 USDC or more");
  }
  if (findOpen("SetLimit", NORTHWIND)) {
    console.log("  raise to 5,000 already waiting for the team");
  } else {
    call(APP, "assistant_propose", { shipper: NORTHWIND, limit: usdc(5_000) }, ASSISTANT);
    console.log("  the assistant suggested 5,000 USDC, waiting for the team");
  }

  step("A new applicant waiting for a second approval");
  if (view<Shipper | null>(APP, "get_shipper", { account_id: MERIDIAN })) {
    console.log(`  ${MERIDIAN} already active`);
  } else if (findOpen("StartShipper", MERIDIAN)) {
    console.log(`  ${MERIDIAN} already proposed`);
  } else {
    call(
      APP,
      "propose",
      { kind: { StartShipper: { shipper: MERIDIAN, limit: usdc(2_000) } } },
      RISK,
    );
    console.log(`  ${MERIDIAN} proposed with 2,000 USDC, 1 of 2 approvals`);
  }

  step("Northwind's network");
  const network = view<Network>(APP, "get_network", { account_id: NORTHWIND });
  for (const driver of [SAM, JORDAN]) {
    if (network?.drivers.includes(driver)) {
      console.log(`  ${driver} already in the network`);
    } else {
      call(APP, "add_driver", { driver }, NORTHWIND);
      console.log(`  added driver ${driver}`);
    }
  }
  if (network?.destinations.some((d) => d.warehouse === LENA)) {
    console.log("  Harbor Hub already linked");
  } else {
    call(APP, "add_destination", { warehouse: LENA }, NORTHWIND);
    console.log("  linked Harbor Hub to Lena");
  }

  step("Check");
  console.log("  pool:", JSON.stringify(view(APP, "get_pool")));
  console.log("  northwind:", JSON.stringify(view(APP, "get_shipper", { account_id: NORTHWIND })));
  console.log(`  open proposals: ${openProposals().length}`);
}

try {
  main();
} catch (e) {
  console.error(`\n✖ ${(e as Error).message}`);
  process.exit(1);
}
