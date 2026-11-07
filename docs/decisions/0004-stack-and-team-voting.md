# 0004 — Stack, Google sign-in and team voting in the contract

- Status: accepted
- Date: 2026-11-08

## Context

Before writing code we need one stack for the whole team, a way for drivers and
warehouses to sign in without a wallet, and a voting setup that can enforce the rules
in 0002 (reject cooldown, expiry).

## Decision

**Stack**

| Part | Choice |
|---|---|
| Package manager | pnpm workspace (`fe`, `be`, `packages/*`) |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, near-connect (`@hot-labs/near-connect`), MapLibre GL with OpenStreetMap tiles, browser camera QR scanning. Hosted on Vercel. |
| Backend | Node.js, TypeScript, Express, near-api-js. Hosted on Railway. |
| Data | Supabase Postgres and private Storage buckets |
| Validation, tests, style | zod, vitest, ESLint + Prettier (fe and be) |
| Contracts | Rust, near-sdk 5.x, cargo-near |

**Google sign-in we build ourselves**

- The browser makes a key pair. After Google sign-in the backend creates
  `<name>.waybil.testnet` with that public key as a function-call key for the waybil contract.
- Actions are signed in the browser as NEP-366 delegate actions and relayed by the backend,
  which pays the gas. The device key never leaves the browser.
- The backend also adds one recovery key to each Google account, so a driver who loses
  their phone can sign in with Google again and get a new device key. This makes the
  backend a partial custodian of Google accounts. That is fine for a testnet demo; a later
  version should move recovery to NEAR's MPC-based account recovery.

**Team voting inside the waybil contract**

- The three team accounts are stored in the contract. `propose` and `vote` live there.
- A general multisig contract does not tell other contracts when a proposal is rejected or
  expires, so it can't enforce the 7-day cooldown from 0002. Keeping votes in our contract
  lets one set of tests cover every rule.
- "Open team wallet" in the admin screens links to the contract on NearBlocks.

## Consequences

- One `pnpm install` at the root sets up the frontend, backend and shared types.
- The contract grows by the proposal logic, covered by its own tests.
- The recovery keys are secrets. They live only in Railway settings and never in the repo.
- This replaces the "Sputnik DAO style" note in 0002. The voting rules in 0002 stay the same.
