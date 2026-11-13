# Waybil backend

Run from the repository root with Node.js 22.22.2+ and pnpm 12.3.4.

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

## Credit assistant (#20)

Apply migration 007, then configure the NEAR AI key, canonical `NEAR_AI_MODEL` and
`NEAR_AI_TRUSTED_SIGNERS_JSON` as described in the API spec. Use an independently verified
model signing key and expiry from official NEAR AI verification tooling. This Node 22 adapter
verifies exact-byte Ed25519 provider_tee signatures against that pin and retains actual
preflight evidence. It labels the result pinned_model_signer and does not claim to perform
fresh Intel/NVIDIA quote verification. Missing, ambiguous or gateway-only evidence fails closed.

Use `NEAR_AI_MODEL=Qwen/Qwen3.8-27B`. The adapter sends it with thinking off
(`enable_thinking: false`); without that it spends every token thinking and returns no JSON.
`z-ai/glm-5.3-flash` is the fallback and gets `reasoning_effort: "low"` instead. Requests to
NEAR AI time out after 120 seconds because the fallback can take about 40 seconds.

Application submission is now connected to the durable evaluator. Searchable PDFs are parsed
locally; JPG/PNG require an image-capable configured model. Unreadable/scanned PDFs ask for a
clear photo or searchable PDF rather than guessing. Company/registration and three recent
consecutive statement months are checked by server rules. Model instructions cannot write
transactions. First limits always wait for two team members.

The reviewed testnet preset is `src/config/credit-policy.testnet.json`: 20% of the three-month
mean outgoing payments, capped at 10,000 test USDC. Copy its JSON into `CREDIT_POLICY_JSON`
explicitly; no formula activates by default. USD statements use a 1:1 test accounting ratio;
IDR and other currencies require a separately reviewed conversion policy. This recommendation
uses expenditure as an activity proxy and does not prove repayment capacity. Decision 0011
records the research, assumptions and acceptance requirements. The shipment fee stays 2.5%.

Leave `CREDIT_AUTO_LIMITS=false` for evidence/suggestions only. Enable it only after provider,
SAMPLE-document and policy acceptance. A policy change does not mutate already
queued review snapshots. Disabling automation stops new writes; existing signed intents
continue reconciliation. Pending proposals, weekly caps, rejection cooldowns and three-more-
repaid-bills eligibility are checked against fresh chain views. Paused shippers and unpaid
overdue bills block fresh review/signing, including bills not yet marked by the late job.
A bounded full proposal-ID
scan handles pending entries older than the newest 50 without a contract change.

Set `CREDIT_WORKER_ENABLED=true` to process queued work every five seconds, or run:

```sh
pnpm --filter @waybil/be build
pnpm --filter @waybil/be credit:once
```

Worker state and signed transaction intent survive restarts. Live acceptance still requires
provider credentials, a verified model key and SAMPLE documents. Seeded existing shippers can create their missing off-chain company record and upload papers
through the existing application routes.
New dependency in #20 is unpdf 1.9.1, compatible with Node 22. This branch depends on
`be/21-reports` and completes the evaluator integration required by #19.

## Team notes and jobs (#22)

Apply migration 008 before running the integrated backend. Team reason records require the
member's actual reject vote. Pause notes require the member's successful finalized direct
pause transaction. Send only the public reason code in the wallet transaction; keep the
private note in the backend request. These routes never sign votes or pauses for the member.

Enable `JOBS_WORKER_ENABLED=true` for the private one-minute scheduler, or use an external
scheduler to invoke the one-shot runner. Late/expiry windows run hourly and reminder windows
run daily in UTC. Avoid enabling both runner modes unless deployment needs it; database
leases still prevent overlapping execution. No public HTTP endpoint triggers jobs.

```sh
pnpm --filter @waybil/be build
pnpm --filter @waybil/be jobs:once
```

The runner records attempts/counts in job_runs. Late marks reuse the relayer's durable signer
queue. Failed finalized marks retain their attempt history before a new signature is allowed.
Uncertain marks reuse the original signed bytes and block new signer work. A bill that is
already marked still gets its missing email queued after a crash. Discovery includes approved
StartShipper proposals, scans all IDs up to 1,000 and pages shipments up to 5,000 per shipper.
The 90-second scan budget fails the window for retry if exhausted; it never calls an incomplete
scan complete. Larger deployments need an indexed chain reader in a separate task.

Reminders send three UTC dates before due, with catch-up on days one/two. Their event key
stays stable across windows. Before sending queued bill mail, the worker rechecks current
status, due date and recipient. Repaid/stale messages are suppressed. Previously ambiguous
sends remain uncertain if suppressed; reconcile them in Resend. Missing email configuration
leaves unsent messages queued. Every successful send keeps its actual provider ID.

Expiry updates open invites conditionally and removes expired login challenges. Failed or
hour-old interrupted document uploads are cleaned under their application lease. Ready
document revisions and report evidence are retained. Leases renew each minute; loss of
ownership stops further side effects. No additional dependencies were added for #22.
This branch depends on `be/20-credit-assistant`. Deployment and live scheduler setup are #23.
See `docs/plans/backend-delivery-15-22.md` for branch order and integration prerequisites.

## Production checks after the backend review

Use Node.js 22.22.2 or a newer 22.x release. The backend package pins that major range.
Railway builds from the repository root with `pnpm --filter @waybil/be build` and starts
`node be/dist/index.js`. Set NODE_ENV=production, RAILPACK_NODE_VERSION=22 and
RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30. Use one replica and /health for the health check.

Production requires explicit JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
RECOVERY_ENCRYPTION_KEY, GOOGLE_CLIENT_ID, RELAYER_PRIVATE_KEY, USERS_PRIVATE_KEY,
APP_URL, CORS_ORIGINS and TRUST_PROXY_HOPS. Both app and browser origins must use HTTPS.
Set TRUST_PROXY_HOPS=1 for Railway's single trusted proxy. Set APP_URL/CORS_ORIGINS to the
actual frontend origin, not the API origin. The service exits before listening if these
settings are missing. Development still supports disabled integrations.

Apply migration 009 after 001–008 for indexed challenge expiry. Google signup funding is
capped at 10 identities per UTC day by default; GOOGLE_SIGNUP_DAILY_LIMIT can lower it or
set it to zero. Existing ready identities can still sign in. Monitor structured diagnostics
for E_SIGNUP_FUNDS and E_SIGNUP_CAP. New accounts receive 0.005 NEAR for storage.

Keep CREDIT_AUTO_LIMITS=false for public testing. Credit checks retry transient errors with
a one-minute delay and at most three attempts. Explicit limit-review requests have a one-day
shipper cooldown; initial resubmissions after needs_more can run on the same day. An AI
failure no longer returns an application to draft. Active shippers can create their missing
company record and replace approved papers before requesting a fresh check. Email workers
stop permanently rejected messages and cap retries at five. Logs omit provider payloads and
credentials. SIGTERM waits for running workers and HTTP requests for up to 25 seconds.
