# Waybil backend

Run from the repository root with Node.js 22+ and pnpm 12.3.4.

```sh
pnpm install
cp be/.env.example be/.env
pnpm --filter @waybil/be dev
```

`GET http://localhost:4000/health` returns `{"status":"ok"}` without external credentials.
Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` together, and a random `JWT_SECRET` of at
least 32 characters, to enable database-backed sessions. Apply the SQL files in
`be/supabase/migrations` in filename order to your Supabase project before using its routes.
The service-role key bypasses RLS and belongs only in the backend environment.

Default browser origin/app URL is `http://localhost:3001`. Set `CORS_ORIGINS` to a comma-separated
list of exact origins. JWT issuer/audience default to `waybil-api` and `waybil-app`. Sessions
last seven days. Keep `TRUST_PROXY_HOPS=0` locally; configure only the actual trusted proxy
count when deploying. Public endpoints have an IP request limit.

```sh
pnpm --filter @waybil/be test
pnpm --filter @waybil/be typecheck
pnpm --filter @waybil/be build
pnpm --filter @waybil/be start
pnpm lint
```

Tests use injected providers and an isolated PostgreSQL-compatible PGlite instance to apply
migrations, check access and test conditional updates. They do not use real keys or documents.
The production bundle includes the shared TypeScript workspace package. Provider dependencies
remain external Node packages. Feature credentials are validated before that feature is used;
missing integrations return an unavailable error rather than a simulated success.

Runtime dependencies added in #15: Express, zod, Supabase client, jose, cors and express-rate-limit.
Development dependencies include tsx, tsup, supertest and PGlite plus type packages.
This backend implementation uses AI assistance. Shared API types live in `packages/shared`;
this work does not wire frontend screens or modify contracts.

## Invitations (#18)

The invitation routes create, list, read and accept seven-day invitations. Warehouse invites
require an address. Public reads omit contact data; acceptance is conditional and returns
`networkLinkRequired` because the shipper must still sign its network change. Signup
reservations protect the invitation for five minutes without consuming it. Google identity
resolution is connected by #16; until then the production accept route fails unavailable.
This branch depends on `be/15-scaffold`. No additional dependencies were added for #18.

## Authentication (#16)

Apply migration 003 and configure Google client ID, the funded users-parent account/key,
Supabase, JWT and `RECOVERY_ENCRYPTION_KEY`. Generate the last value with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` in your local
terminal and keep it in the backend environment. Changing it requires re-encrypting existing
records first. See decision 0008 for custody. The browser supplies only its public device key.

Request a challenge first. Wallets sign the exact returned NEP-413 fields; Google clients
pass the returned nonce to Google Identity Services. Send `challengeId` with the login result.
The Google login body is `{challengeId,idToken}`; the device key/invite are bound to the
challenge. A fresh driver needs no invite; warehouse role requires an invitation. Seven-day
JWTs are versioned and old device sessions stop working after recovery.

`GOOGLE_ACCOUNT_NAMES` optionally maps SHA-256 Google subject hashes to demo account slugs.
It is server configuration, never a requested client account ID. Existing accounts are only
reused when the persisted recovery key proves ownership. Parent funding and demo identity
coordination remain required before testnet acceptance. No external credentials are provided
by this branch. Runtime dependencies added in #16 are near-api-js 7.4.0 and google-auth-library.
Use Node.js 22.22.2 or newer for the SDK. This branch depends on `be/18-invites`.

## Relayer (#17)

Configure the funded relayer account/key and apply migration 004. Send the SDK's
`encodeSignedDelegate` output as base64 in `{signedDelegate}` using the current Google session.
Only role-scoped pickup/delivery calls are accepted. Responses contain the original transaction
hash and execution status, never an invented payment receipt. Read the shipment view for payout
status. Retries reconcile or rebroadcast the same signed outer transaction. An unresolved
transaction blocks new relayer signatures until its outcome is known; investigate the original
hash/RPC rather than clearing records and signing the user action again.

Problem confirmations require the #21 report validator; this path fails unavailable until that
integration is present. The per-account HTTP limiter is process-local; shared database leases,
request deduplication and nonce validation protect transaction submission across processes.
The later deployment task must size the HTTP limit for its replica count. New dependency in
#17 is borsh 2.0.0 for decoding the SDK schema. This branch depends on `be/16-auth`.

## Applications and documents (#19)

Apply migration 005. `POST /v1/applications` accepts the company fields in the API spec;
`shippingSpend` is base units, not a decimal display string. Upload one multipart `file`
with a `kind` of registration, bank_statement or tax_id. Only the first two are required.
The server inspects file bytes, limits each upload to 2 MiB and records its SHA-256. Storage
bucket `documents` is private. Links returned to the owner or team expire after 300 seconds.
Document revisions retain their evidence; interrupted writes retain a cleanup record.

Company edits and uploads are allowed in draft or needs_more. Submission becomes available
when #20 connects the evaluator. Its absence returns 503; no fake assistant result is stored.
Admin approval linkage verifies a matching StartShipper proposal and reconciles its actual
execution. The backend does not vote. Set `EMAIL_API_KEY` and verified `EMAIL_FROM` for Resend
notifications. Missing configuration leaves emails queued. Ambiguous sends stop automatic
retry after 23 hours and require provider reconciliation. See decision 0009.

Runtime dependencies added in #19 are multer and file-type; the Multer type package is a
development dependency. File-type requires Node.js 22+. This branch depends on `be/17-relayer`.

## Problem reports (#21)

Apply migration 006 for reports and the private report-photos bucket. POST multipart with
a JSON `report` field and up to five `photos`. Use the reason codes in shared types; the
frontend's display labels must map to these codes. Server counts use the live shipment quantity.
The saved hash covers normalized report JSON and each ordered photo hash. A retry resumes
the same immutable report and file paths. Participant/team reads return five-minute links.

Use the returned `confirmArgs` in a warehouse-signed delegate. The relayer now checks the
actual stored report before sponsoring the confirmation. A saved report has `recorded=false`
until the contract contains its hash. Photos, note or quantity changes invalidate the proof.
No new dependencies were added. This branch depends on `be/19-applications`.
