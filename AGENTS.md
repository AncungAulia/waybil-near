# Waybil — Agent & Contributor Rules

Waybil pays freight carriers the moment a delivery is confirmed, financed by a
lending pool on NEAR. Built for NEAR HACKATHON (deadline 2026-11-14 23:59 UTC).

Roles (use these names in code, UI, and docs):
**Shipper** (company that ships goods and pays the bill), **Driver** (truck owner who
gets paid on arrival), **Warehouse** (receiver that confirms delivery),
**Investor** (funds the pool), **Admin** (team multisig).

Everything in this repo is written in **English**: code, comments, docs, commit
messages, and PR descriptions.

## Team & ownership

| Area      | Owner     | Folder       |
|-----------|-----------|--------------|
| Contracts | Ancung    | `contracts/` |
| Frontend  | Yeypayeyy | `fe/`        |
| Backend   | Nasta     | `be/`        |

Stay inside your area. If a change must touch another area, say so in the PR
and tell that owner.

Each app folder has its own rules on top of this file: `fe/AGENTS.md` (design, UI and
motion rules) and `be/AGENTS.md` (API, data and key rules). Read them before working there.

## Writing UI copy

- Plain words a truck owner understands. No jargon or buzzwords in the UI:
  avoid "on-chain", "multisig", "contract", "agent", "TEE", "attestation", "gasless".
  Say "recorded", "team approval", "credit assistant", "private check", "proof".
- Full, simple sentences (subject, verb, object). No colons or semicolons in UI text.
- The middle dot (·) only joins short facts, for example "#1041 · Sam · due Dec 11".
  Anything with a verb or a money outcome is written as full sentences instead.
- Links to the blockchain explorer read "See the record on NearBlocks ↗".
- Use one arrow per link. Plain text links end with "↗". Buttons and cards that already
  show an arrow icon drop the "↗" from their label.
- Footer links drop the "↗" and use short labels, for example "X", "GitHub" and "NearBlocks".

## Repo layout

```
contracts/waybil/     main contract (shipments, credit, pool, team votes) · Rust
contracts/mock-usdc/  NEP-141 test token · Rust
fe/                   Next.js app · pnpm workspace package
be/                   Express API, relayer, credit assistant · pnpm workspace package
packages/shared/      TypeScript types shared by fe and be
scripts/              testnet deploy & seed scripts
design/               Pencil design file, logo, shaders
docs/PRODUCT.md       what Waybil does (source of truth)
docs/ARCHITECTURE.md  how it is built (source of truth)
docs/STRUCTURE.md     where code goes in fe, be, packages, contracts
docs/specs/           interfaces: contract.md, backend-api.md, demo-data.md
docs/decisions/       short decision records (NNNN-title.md)
docs/plans/           review notes and task plans
```

## Source of truth

- Read in this order before changing anything: `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`,
  then the spec for your area (`docs/specs/contract.md` or `docs/specs/backend-api.md`).
- Specs change **before** code. If an interface or rule changes, update the spec,
  and add a decision record when it changes product behaviour, in the same PR.
- Work is tracked as GitHub issues. Link the issue in the PR ("Closes #12").
- Package manager is **pnpm** for everything JavaScript. Don't commit `package-lock.json`
  or `yarn.lock`.

## Branching

- `main` is always deployable. Never commit or push directly to `main`.
- One branch per task: `<area>/<short-desc>`, for example
  `contracts/repay-flow`, `fe/wallet-connect`, `be/relayer`, `docs/readme`.
- Branch from the latest `main`. Rebase on `main` before opening a PR.
- Delete the branch after it is merged.

## Commits

Conventional Commits, with the area as scope:

```
feat(contracts): add repay via ft_transfer_call
fix(fe): show NearBlocks link after a transaction
docs: add how-to-run steps to README
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
Keep commits small, written in the imperative ("add", not "added").

## Pull requests

- One task per PR. Fill in the PR template.
- Describe what changed and how to test it ("do X, see Y"). Add screenshots for UI.
- Review is optional. You may merge your own PR once build and tests pass.
- Use squash merge.

## Network & accounts

- Testnet only, except NEAR Intents (mainnet only; use small amounts).
- Accounts:
  - `waybil.testnet` — admin / deployer
  - `usdc.waybil.testnet` — mock USDC
  - `app.waybil.testnet` — main contract
  - `shipper.`, `investor.`, `driver.`, `warehouse.waybil.testnet` — demo users
- Use NEAR account IDs everywhere. Never use 0x addresses.

## Secrets

- Never commit `.env` files, private keys, seed phrases, or API keys.
  Commit a `.env.example` with empty values instead.
- Never put secrets in `NEXT_PUBLIC_*` variables.
- Keys live in each person's local keychain. Don't paste keys into chat, issues, or PRs.

## Rules for AI agents

- Read this file, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` and the relevant
  `docs/specs/` before changing code.
- Use the NEAR skills in `.claude/skills/` for NEAR-specific work.
- Write everything fresh in this repo. Don't copy code from other repositories,
  and don't reference other projects in code, docs, or commits.
- Don't add a dependency without listing it in the PR.
- Don't commit, push, or merge unless the human asks.
- Note AI-generated code in the PR description (the hackathon requires disclosure).

## Commands

From the repo root:

| Command | What it does |
|---|---|
| `pnpm install` | Installs every workspace package |
| `pnpm lint` | ESLint over all TypeScript |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm test` | vitest in every package |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm --filter <pkg> <script>` | Run one package, for example `pnpm --filter @waybil/shared test` |

TypeScript stays on 6.0.x until typescript-eslint supports 7.

Contracts, from `contracts/<name>/`:

| Command | What it does |
|---|---|
| `cargo test` | Unit tests, plus sandbox tests on Linux and macOS |
| `cargo near build non-reproducible-wasm --no-abi` | Builds the wasm into `target/near/` (`--no-abi` is needed on Windows) |
| `cargo clippy --target wasm32-unknown-unknown --lib -- -D warnings` | Lints the contract |
| `cargo fmt` | Formats Rust |

near-sandbox has no Windows build, so sandbox tests run in CI (`.github/workflows/ci.yml`).

Each contract's ABI (every method, its arguments and types) is committed at
`contracts/<name>/abi/<name>.json` for fe and be. After changing a public method, run
`pnpm --filter @waybil/scripts abi` and commit the result. CI fails when the ABI is out of date.

Testnet, from the repo root (needs near-cli-rs and the `waybil.testnet` key in your keychain):

| Command | What it does |
|---|---|
| `pnpm --filter @waybil/scripts deploy-contracts` | Creates missing accounts, builds and deploys `app.waybil.testnet`, registers token storage. Safe to rerun. |
| `pnpm --filter @waybil/scripts deploy-contracts --no-build` | The same with the wasm already built |
| `pnpm --filter @waybil/scripts seed` | Seeds the demo story (wallets, pool, team approvals, credit, Northwind's network). Safe to rerun. |

Backend and frontend commands are added here when each part lands.

## Definition of done

It builds, tests pass, it works on testnet, and the README "How to run" steps
are still accurate.
