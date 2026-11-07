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

## Writing UI copy

- Plain words a truck owner understands. No jargon or buzzwords in the UI:
  avoid "on-chain", "multisig", "contract", "agent", "TEE", "attestation", "gasless".
  Say "recorded", "team approval", "credit assistant", "private check", "proof".
- Full, simple sentences (subject, verb, object). No colons or semicolons in UI text.
- The middle dot (·) only joins short facts, for example "#1041 · Pak Budi · due Dec 11".
  Anything with a verb or a money outcome is written as full sentences instead.
- Links to the blockchain explorer read "See the record on NearBlocks ↗".
- Use one arrow per link. Plain text links end with "↗". Buttons and cards that already
  show an arrow icon drop the "↗" from their label.

## Repo layout

```
contracts/waybil/     main contract (shipments + lending pool)
contracts/mock-usdc/  NEP-141 test token
fe/                   Next.js app
be/                   API, gasless relayer, AI credit agent
scripts/              testnet deploy & seed scripts
docs/specs/           feature designs (what & why)
docs/plans/           task plans per feature
docs/decisions/       short decision records (NNNN-title.md)
```

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

- Read this file and the relevant `docs/specs/` before changing code.
- Use the NEAR skills in `.claude/skills/` for NEAR-specific work.
- Write everything fresh in this repo. Don't copy code from other repositories,
  and don't reference other projects in code, docs, or commits.
- Don't add a dependency without listing it in the PR.
- Don't commit, push, or merge unless the human asks.
- Note AI-generated code in the PR description (the hackathon requires disclosure).

## Commands

Filled in per area once each part is scaffolded (build, test, run, deploy).

## Definition of done

It builds, tests pass, it works on testnet, and the README "How to run" steps
are still accurate.
