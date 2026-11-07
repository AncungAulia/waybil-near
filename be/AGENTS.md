# Backend rules (`be/`)

Owner: Nasta. These rules add to the root `AGENTS.md`; they don't replace it.

## Read first

1. Root `AGENTS.md` (branching, commits, secrets).
2. `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`.
3. `docs/specs/backend-api.md`: every endpoint, job, table and env variable.
4. `docs/STRUCTURE.md`, section "Backend": where every file goes.
5. `docs/specs/contract.md` for every contract call, and decisions 0002 to 0004.

## Stack

Node.js 22, TypeScript, Express, zod, vitest, near-api-js, Supabase (Postgres and Storage),
NEAR AI Cloud for the credit assistant. Hosted on Railway. Managed with pnpm.
Shared request and response types live in `@waybil/shared`.

## Rules

- Change `docs/specs/backend-api.md` before you change an endpoint.
- Routes only parse and call a service. Services hold the logic. `lib/` knows nothing about Express.
- Every request body and param goes through a zod schema. Errors use
  `{ "error": { "code": "E_...", "message": "..." } }`.
- The backend keeps off-chain data only. Money rules and balances come from the contract.
  Never store a copy of chain state that the UI trusts.
- Personal data (names, phones, emails, papers, photos) never goes on chain. Store a sha256
  hash on chain when proof is needed.
- Files: PDF, JPG or PNG, 2 MB max, in private buckets, served by short-lived signed links.
- The relayer only sends delegate actions to `app.waybil.testnet` for the allowed methods,
  and checks that the sender matches the session.
- Keys (relayer, assistant, recovery) live only in Railway settings and local `.env`.
  `be/.env.example` lists every variable with an empty value.
- Error messages that reach the UI are plain sentences (see "Writing UI copy" in the root
  `AGENTS.md`).
- Every service has vitest tests next to it. Mock the chain and Supabase in unit tests.
