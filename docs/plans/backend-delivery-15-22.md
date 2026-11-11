# Backend delivery for #15 to #22

Date: 2026-11-09. Owner: Nasta. Implementation uses AI assistance.

The eight backend tasks have separate pushed branches. They form a dependency stack so each
issue can be reviewed against its parent below. Review and merge in this order; subsequent
branches need rebasing after a squash merge. Main is unchanged. No pull requests, merges or
issue closures were performed. The original plan is `backend-issues-15-22.md`.

| Issue | Branch | Review base | Result |
| --- | --- | --- | --- |
| #15 | `be/15-scaffold` | `main` | Runnable API, sessions, profiles, middleware, database/test harness |
| #18 | `be/18-invites` | `be/15-scaffold` | Private seven-day invitations, reservations and conditional acceptance |
| #16 | `be/16-auth` | `be/18-invites` | NEP-413 wallet login, verified Google login, account creation and recovery |
| #17 | `be/17-relayer` | `be/16-auth` | Verified role-scoped signed delegates with durable transaction reconciliation |
| #19 | `be/19-applications` | `be/17-relayer` | Company applications, private document revisions, approval linkage and Resend outbox |
| #21 | `be/21-reports` | `be/19-applications` | Immutable problem reports/photos, reproducible hashes, relayer validation |
| #20 | `be/20-credit-assistant` | `be/21-reports` | Private paper checks, explicit credit policy, verifiable model signatures, durable reviews |
| #22 | `be/22-jobs-and-notes` | `be/20-credit-assistant` | Verified private team notes, late/reminder/expiry jobs, renewed leases and email recovery |

The #19 branch exposes the submission interface; #20 connects its evaluator. The integrated
head at #22 contains both and the #21 report validator required by #17. Apply all eight SQL
migrations in filename order before running that integrated head.

## Validation

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm --filter @waybil/be build
```

Local lint/typecheck pass. After the 2026-11-10 policy update, tests pass: 76 backend,
17 frontend and 6 shared, 99 total.
The backend tests apply every migration in an isolated PGlite database and check private
table access, conditional writes and lease ownership/renewal. Provider tests use injected
adapters, real local cryptographic signatures and SAMPLE files; no real email or funded
transaction is sent by these checks. Docker is not needed for this test suite.

The production build starts successfully with Node.js v23.10.0 in this workspace. HTTP smoke
checks cover health, authentication, protected team routes, missing public job routes, bad
JSON and disallowed origins. The one-shot jobs command without credentials exits with an
unavailable result rather than reporting success. The project targets Node.js 22.22.2+;
repository CI uses Node 22. The broken local pnpm launcher was repaired and reports 12.3.4.

## Configuration and live acceptance

`be/README.md` documents commands and feature settings. Every variable in `be/.env.example`
has an empty value. Supply credentials through local/backend environment settings, never
chat, committed files or frontend public variables.

- Apply migrations and configure Supabase service-role access, JWT and recovery encryption.
  Private bucket permissions and five-minute signed links still need live Supabase acceptance.
- Configure Google audience and the funded users-parent account. Coordinate the verified
  demo identity mapping and token storage with Ancung before running seed stage two.
- Fund/configure the relayer and assistant accounts. Validate real pickup/delivery, recovery,
  report settlement, initial team approval and late-mark receipts on testnet.
- Use Resend with a verified sender. Confirm real rejection/reminder/late messages and retain
  provider IDs. Ambiguous sends beyond 23 hours require provider reconciliation.
- Configure the confidential model and independently verified model signer pins. This Node 22
  adapter verifies exact-byte provider signatures and records preflight evidence; its proof
  mode is `pinned_model_signer`. It does not claim fresh Intel/NVIDIA hardware-quote validation.
  Test real SAMPLE searchable PDFs/photos and the model's image capability before live use.
- Decision 0011 selects the opt-in USD testnet policy: 20% of mean monthly outgoings over
  three months, capped at 10,000 test USDC with an explicit 1:1 accounting conversion.
  The local CREDIT_POLICY_JSON is configured; provider credentials remain separate.
  `CREDIT_AUTO_LIMITS` stays false pending live acceptance. First limits require team approval.
- Enable the credit/jobs workers or invoke their one-shot commands from the later deployment
  task. Bounds are 1,000 proposal IDs and 5,000 shipments per shipper with a scan deadline;
  exceeding a bound returns unavailable instead of silently ignoring records.

These external acceptance checks remain pending; no credentials or real SAMPLE evidence were
provided for them. Issues remain open. Railway deployment, scheduler hosting and the public
URL acceptance check are #23 and were not performed.

## Integration handoff

Frontend ownership stays with Yeypayeyy. Contract/seed ownership stays with Ancung. No files
in those areas were changed. The API spec and `@waybil/shared` define challenge/session
bodies, multipart fields, report hashes, proposal linkage, reason codes and proof references.
The backend never replaces live chain balances or shipment status with database copies.

Follow-ups identified in the original plan remain separate: eight-character delivery code
issuance/lookup, authorized network/shipment contact and address metadata, live location,
custom settlement explanations and additional document proofs on NEAR. Existing frontend
demos need explicit API/wallet wiring and live acceptance before their demo boundaries can
be removed.

Runtime dependencies introduced: Express, zod, Supabase client, jose, cors, express-rate-limit
(#15); near-api-js and google-auth-library (#16); borsh (#17); multer and file-type (#19);
unpdf (#20). Development dependencies include tsx, tsup, supertest, PGlite and type packages.
No additional dependencies were introduced in #18, #21 or #22.
