# Backend implementation plan for issues #15 to #22

Date: 2026-11-09. Owner: Nasta. Status: draft for review before implementation.

This plan covers the eight backend issues. Railway deployment (#23) is a later task.
Endpoint additions, tables, packages and defaults described as proposed below are planning
decisions, not changes to the accepted API or product rules. Update the relevant spec before
implementing them. Record changes to product behaviour or key custody in a decision record.

## Repository baseline

Reviewed local and GitHub `main` at `b11832384c927098f36eb4b33cfe412118b22c20`.
All eight issues are open and name Nasta as owner. Their bodies have no additional comments.

- `be/` contains `AGENTS.md` and `CLAUDE.md` only. There is no backend package, server,
  environment example, migration, or test suite to extend.
- `pnpm-workspace.yaml` already includes `be`. Node.js 22 and pnpm 12.3.4 are the project
  targets. TypeScript must remain on 6.0.x.
- `packages/shared` exports TypeScript source with extensionless internal imports. It has
  money helpers and contract view types, but no `api.ts` or `codes.ts`. A plain backend
  `tsc` build must not be assumed to produce a runnable production app with this package.
- The frontend has five role apps, onboarding, validation, QR scanning and local demos.
  Authentication, API calls, private uploads and wallet signing are still pending.
- The current ABI has the methods needed for these issues. Use the committed ABI and Rust
  implementations for serialization details; some prose in `contract.md` describes future
  features or older field names.
- `scripts/deploy.ts` provisions the relayer and assistant accounts but not
  `users.waybil.testnet`. `scripts/seed.ts` explicitly waits for #16 to create the Google
  accounts before its shipment stage. Coordinate demo accounts with Ancung.
- Local preflight found Node.js v23.10.0, no `node_modules`, and a broken pnpm 12.3.4 launcher
  (`ENOEXEC`). Fix the toolchain at the start of #15 before installing or running checks.
  No application checks have been run as part of this planning task.

Read: root/backend rules; `PRODUCT.md`, `ARCHITECTURE.md`, `STRUCTURE.md`; API, contract and
demo-data specs; decisions 0002 to 0004; role READMEs and relevant frontend forms; contract
views, shipment, shipper, assistant and team code; ABI, deploy/seed scripts and CI.
The repository's `near-api-js` and `near-ai-cloud` skills also informed this plan.

## Implementation boundaries

- Implement services in `be/`, with shared API types/errors in `packages/shared` and matching
  spec updates in `docs/`. List new packages in each PR. Root lockfile changes are expected.
- Frontend wiring belongs to Yeypayeyy; contracts and seed scripts belong to Ancung. Specify
  any required change and its owner rather than silently implementing it in a backend PR.
- Each implementation task gets a branch from the latest `main` and a focused PR referencing
  its issue. This planning branch is `be/plan-15-22`. Commit, push and merge only when asked.
- Money, shipment status, credit limits, pool balances and votes remain authoritative on
  NEAR. Database rows may contain off-chain workflows, references and retry receipts, but
  must not become a second balance or shipment-state ledger.
- Keep USDC in base-unit strings at JSON boundaries and `bigint` for arithmetic. Keep chain
  nanoseconds as strings. Reject numeric IDs outside the shared types' safe integer range.
- Device private keys stay in the browser. Backend keys never appear in shared exports,
  responses or logs. Driver and warehouse actions require their signed delegate action.
- No real documents, secrets or provider calls in ordinary tests. External checks use testnet
  and fictional documents marked SAMPLE. Do not fabricate signatures or transaction hashes.

## Delivery sequence

| Order | Issue | Deliverable and dependency |
| --- | --- | --- |
| 1 | [#15](https://github.com/AncungAulia/waybil-near/issues/15) | Runnable API, middleware, profiles, migrations and test harness. |
| 2 | [#18](https://github.com/AncungAulia/waybil-near/issues/18) | Invite lifecycle using #15's session contract. Test with signed test principals; validate live login integration after #16. |
| 3 | [#16](https://github.com/AncungAulia/waybil-near/issues/16) | Wallet/Google login, account provisioning, recovery and profiles using real invite validation from #18. |
| 4 | [#17](https://github.com/AncungAulia/waybil-near/issues/17) | Signed pickup/delivery relayer using the accounts and sessions from #16. |
| 5 | [#19](https://github.com/AncungAulia/waybil-near/issues/19), first slice | Application forms, private documents, admin review, rejection email and a submission workflow ready for #20. |
| 6 | [#21](https://github.com/AncungAulia/waybil-near/issues/21) | Reports and photo hashes, reusing #19's storage code and #17 for confirmation. |
| 7 | [#20](https://github.com/AncungAulia/waybil-near/issues/20) | Initial document checks and active-shipper credit reviews. Connect #19 submission to the real evaluator. |
| 8 | #19, completion | Verify submit/review/approval transitions against the connected evaluator before declaring the whole issue done. |
| 9 | [#22](https://github.com/AncungAulia/waybil-near/issues/22) | Team notes and scheduled jobs, reusing invites, profiles and the email helper. |

This order removes the Google-login/invite dependency cycle. #18 can be implemented before
the login routes because #15 defines verified session principals; test fixtures must never
be exposed as a development login endpoint. Keep #18 open until its live #16 flow passes.
Likewise, merging the first #19 slice does not mean its assistant-dependent flow is finished.

Investigate model privacy, document formats and proof retrieval early while specifying #19
and #20. Discovering an unreadable-document limitation only after uploads are built would
put the credit flow at risk. This is an integration check, not a separate service or issue.

## #15: API foundation

**Build**

1. Create `@waybil/be` with `src/index.ts`, `src/app.ts`, `config/env.ts`, middleware,
   `lib/supabase.ts`, `types/` and colocated Vitest tests, following `STRUCTURE.md`.
   Use an app factory with injected dependencies; importing it must not start a listener,
   require real keys or make network calls.
2. Add `dev`, `build`, `start`, `typecheck` and `test` scripts. Proposed tooling is `tsx watch`
   for development and `tsup` for an ESM production bundle that includes `@waybil/shared`.
   Test `node dist/index.js`, not just type checking. Verify the issue's `--filter be`
   command as well as the canonical `pnpm --filter @waybil/be dev` command.
3. Define `/health` in the API spec as a liveness route. Validate configuration with zod,
   set an explicit browser-origin allowlist, limit request bodies, and return consistent
   `{ error: { code, message } }` errors. Do not expose raw provider/SQL errors to clients.
4. Implement JWT verification and role middleware, request body/param validation, rate
   limiting, not-found handling and a final error handler. Invalid, expired and forged
   sessions must fail; admin privileges must be checked against current team membership.
5. Add the first `profiles` migration with a unique NEAR account ID and an agreed role
   lifecycle. Include fields needed by onboarding, including truck plate for a driver.
   Disable direct anonymous/client access; the server service-role client requires explicit
   ownership checks because it bypasses row-level policies.
6. Add shared error and session/profile types. Feature-specific types and tables arrive
   with their owning issue rather than creating speculative empty modules.
7. Add `be/.env.example` with every existing spec variable empty. Specify additional
   configuration before use: browser origin/app URL, JWT issuer/audience, recovery custody,
   email sender and AI model. Validate features in stages; missing Google/AI credentials
   must not masquerade as working integrations or prevent isolated health/tests.
8. Add `be/README.md` and update root run instructions for local development and checks.

**Proposed dependencies:** Express, zod, `@supabase/supabase-js`, `jose`, `cors`,
`express-rate-limit`; `tsx`, `tsup`, needed type packages and the existing Vitest/TypeScript
toolchain for development. Add a header/logging package only if there is a concrete need.

**Verify:** fresh migration; health over HTTP; malformed input; missing/expired/tampered JWT;
role denial; 404/error response shape; configured origin handling; production build/start
and shared-package imports. Tests inject the database; no real Supabase connection in CI.

## #18: Invitations

**Build**

1. Add `invites` with a unique opaque code, owning shipper, driver/warehouse type, contact
   fields, warehouse address, expiry, accepted account and acceptance timestamp. Add DB
   constraints and an atomic claim function so concurrent accept requests cannot both win.
2. Implement the specified create, public-read and accept routes. Creating requires an
   active shipper verified on NEAR. Public reads return only the specified company/type/state
   information. The seven-day expiry is checked on every read/accept, even before #22 runs.
3. Acceptance requires a verified Google principal with the matching role. Define retry
   behaviour for the same claimant and reject a different claimant or an expired invitation.
   Issuing a session must not consume the invite; explicit acceptance remains a separate step.
4. Export invite validation for #16. Reject bad warehouse invites before account creation;
   recheck expiry and claims at acceptance. Document how provisioning reserves an invite
   against competing signups without prematurely showing it as used.
5. Return the accepted account needed by the shipper's next wallet action. Backend acceptance
   does not call `add_driver` or `add_destination`; only the shipper signs those methods.
   Proposed spec addition: an owner-only `GET /v1/invites` so the shipper can discover accepted
   accounts after opening the app again.

**Verify:** seven-day boundaries; unknown/open/used/expired states; type mismatch; no private
contact leakage; simultaneous claims; retries; and failure of the later wallet action does
not falsely claim the account is linked on NEAR. Complete a real invite/login/accept test in #16.

## #16: Authentication, accounts and recovery

**Specify before implementation**

- Proposed `POST /v1/auth/challenge`: a short-lived, single-use challenge for wallet or
  Google login. Persist the attempt so replay checks survive server restarts. Define the
  exact message, recipient, callback policy, nonce encoding and response types with frontend.
- Wallet verification binds the full challenge and account to a live full-access public key.
  A key merely existing on the account is insufficient for NEP-413 authentication.
  See the [NEP-413 specification](https://github.com/near/NEPs/blob/master/neps/nep-0413.md).
- Define first-time role selection: a new wallet may request shipper or investor, not admin;
  Google warehouse role comes from an invite; driver signup can work without an invite,
  matching the existing onboarding flow. Returning users cannot switch roles in a login body.
- Resolve recovery-key custody in an ADR before generating keys. Recommended design is
  one encrypted recovery key per Google account, with the encryption key only in local/Railway
  secrets. This requires an explicit clarification of the current "keys only in settings"
  rule to permit encrypted database records. Do not substitute one shared full-access key
  for every user's required per-account recovery key.

**Build**

1. Add private auth identities/provisioning records and auth challenges. Map Google `sub`
   to one profile; never identify the account by mutable email or a client-supplied slug.
   Record provisioning steps so retries resume the same account after partial failure.
2. Verify wallet signatures, key ownership/permission and the exact stored challenge before
   atomically consuming it and issuing a seven-day JWT.
3. Verify Google's signature, audience, issuer, expiry and login-attempt nonce. Bind the
   attempt to the new device public key so it cannot be swapped during recovery. Use
   `google-auth-library`, following [Google's server verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
4. Provision `<name>.users.waybil.testnet`, not the older account pattern in issue #16.
   Account naming must handle collisions and never attach a Google identity to an existing
   account merely because its name matches. Coordinate the fixed Sam/Jordan/Lena demo
   identities with Ancung using verified identities, not arbitrary client name claims.
5. Add only the role's allowed function-call methods on `app.waybil.testnet` to the device
   key. Add the distinct recovery key. Register token storage with `storage_deposit` before
   marking provisioning ready, so a driver's first payout can succeed.
6. On a new device, verify Google again, recover the same account and replace its device
   key. Specify old-key revocation and session-version invalidation. Concurrency must not
   create two accounts or lose track of a successfully added key.
7. Implement `GET /v1/me` and `PUT /v1/me/profile`, using shared request/response types.
   Profile edits cannot replace account IDs, Google identities, roles or administrative rights.

**Verify:** valid and invalid signatures; wrong recipient/key permission; replay and concurrent
challenge use; incorrect Google claims/nonce; optional driver invite and required warehouse
invite; concurrent signup; account-created/token-registration-failed recovery; device replacement;
lost-device session invalidation; role escalation; and profile ownership.

**External prerequisite:** Ancung provisions/funds `users.waybil.testnet` and securely supplies
its key. The backend never needs `waybil.testnet`'s admin key. Add `near-api-js` here and pin
the version/API actually tested; the repository's examples target its newer Account API.

## #17: Signed transaction relayer

**Build**

1. Agree the base64 Borsh encoding of `SignedDelegateAction` with frontend and use the SDK
   codec. Reject malformed/trailing input. Never accept an unsigned JSON method request.
2. Require a Google session. Check the delegate signature, live registered device key,
   sender/session match, receiver, expiry, nonce, method arguments and role. Permit exactly
   one function call with zero attached deposit. Only `confirm_pickup` and `confirm_delivery`
   are eligible, narrowed by role. Set explicit gas/request/rate limits in the spec.
3. Resolve shipment/destination views for participant checks before sponsoring a call.
   The contract remains responsible for the definitive state transition. Function-call keys
   have a single-call restriction under [NEP-366](https://github.com/near/NEPs/blob/master/neps/nep-0366.md).
4. For a reported delivery, check that #21's immutable report hash, shipment, warehouse and
   good quantity match. Introduce this check when #21 is connected; do not claim report
   integrity before that integration exists.
5. Keep a small operational request record keyed by delegate digest for duplicate/retry
   handling. Return a real transaction hash and a documented pending/final result. A hash
   alone does not prove a payout succeeded; read final outcomes and the shipment view.
6. Handle uncertain broadcast results by reconciling the original transaction/nonce before
   sending again. Bound concurrency for the relayer signing key. No new user action is
   signed on their behalf, and the public allowlist never gains job/admin methods.

**Verify:** receiver/method/sender/key/role mismatches; invalid signature; replay; expired
delegate; excess gas; attached funds; multiple/non-function/nested actions; invalid args;
duplicate submission; account rate limits; RPC timeout; contract failure; failed payout callback.
The testnet check signs with an actual restricted device key and observes pickup then delivery.

## #19: Applications and private documents

**Build**

1. Add `applications` and `application_documents`. Define canonical fields from the existing
   company form: registration, location/address, contact/role, email/phone, trips, monthly
   shipping spend and routes. Freeze validation and decimal encoding with frontend rather
   than importing its demo component or location fixtures into the server.
2. Specify allowed transitions for `draft`, `in_review`, `needs_more`, `approved` and
   `rejected`. Proposed additions are an owner-only draft/needs-more edit operation and an
   admin proposal-link operation; neither is currently described by the API tables.
3. Implement create/read, document upload, submit, admin list/detail and rejection. Require
   registration and bank statement before submission; tax ID remains optional. Block edits
   to the immutable document snapshot while its review is running.
4. Build `lib/storage.ts` for private buckets, randomized paths, byte-level type/size checks,
   SHA-256 and authorized short-lived links. Document files are PDF/JPG/PNG, at most
   2,097,152 bytes, matching frontend validation. Proposed signed-link lifetime is five
   minutes. Reject oversize uploads with a stable 413 error the C5.3 screen can display.
5. Add compensation for failed storage/database writes and replacement-file cleanup.
   Do not expose a public storage path, trust an uploaded MIME label alone, or log file contents.
6. Link an actual `StartShipper` proposal to the application after checking its shipper,
   proposing team member and receipt. Reconcile its current result from the contract.
   Only verified execution can make the application approved. The API never casts approvals.
7. Introduce `lib/email.ts` and `email_log` here for the rejection requirement. Choose the
   provider/sender before implementation; use a durable, deduplicated send record. #22 reuses
   this helper instead of making #19 depend on all scheduled jobs. A delivery failure must
   not undo the recorded rejection or pretend the email was sent.
8. Submission starts the shared document evaluator delivered in #20. Until connected,
   explicitly expose the incomplete integration; do not return an invented credit result.
   Close the full issue only after that path is verified.

**Verify:** owner isolation; current team membership for admin routes; required files;
type spoofing, empty/oversize upload; hash equality; private bucket access; link expiry;
storage/DB partial failures; draft/resubmission rules; duplicate submit/reject/email; and
approval staying pending until two real team approvals execute.

## #21: Warehouse reports and photos

**Build**

1. Add `reports` and `report_photos`, reusing #19's private storage code. Restrict photos
   to JPG/PNG and 2 MB each. Proposed aggregate limit is five photos; specify the file-count,
   multipart-body and note limits before code. Validate count against the live shipment's
   `qty`, not the demo value 120.
2. POST authorization resolves `get_shipment` and `get_destination`: the session must be
   the assigned warehouse and the shipment must still permit a report. Require valid
   reason codes; preserve the agreed note and photo ordering.
3. Define a versioned canonical JSON representation covering shipment ID, warehouse,
   good quantity, normalized reasons, note and every photo's byte hash. Hash those exact
   canonical bytes. Store the canonical representation and photo order so the digest can
   be reproduced. Keep a committed report immutable and make retries return its same hash.
4. Return `reportHash` and validated confirmation args. Frontend signs `confirm_delivery`
   and sends it to #17. A stored report alone does not confirm delivery or hold funds on NEAR.
5. GET authorization checks the current shipment shipper, driver, assigned warehouse or
   current team membership. Mint photo links only after that check. If the chain records
   a report hash, serve the matching report or report an integrity error.
6. Handle competing posts/confirmations and partial upload cleanup. A failed/reverted
   chain confirmation must not overwrite or invalidate evidence already used by a signature.

**Verify:** outsider/other-warehouse denial; participant reads; quantity boundaries; malformed
photos; concurrent duplicate reports; byte-identical retry hashes; digest changes for altered
note/count/photo/order; cleanup; and testnet report -> held payout -> wallet-signed settlement.
Settlement remains a shipper transaction; the backend does not choose the payout.

## #20: Credit assistant

**Decisions needed before automatic limit changes**

- Decision 0002 defines narrow document checks, but no formula converts verified monthly
  outgoing payments into a starting/revised limit. The team must specify a versioned policy,
  currency handling, bounds and examples. Do not let the model invent this policy.
- Select a currently available confidential model and validate its PDF/image input path.
  The current [NEAR AI model catalog](https://docs.near.ai/cloud/models) distinguishes
  confidential inference from incognito external-provider models; a gateway URL alone
  is insufficient to establish the required model privacy.
- Plain-text PDFs may be extracted locally. Scanned PDFs/photos need a tested confidential
  extraction path. An unreadable or ambiguous document becomes `needs_more` / "Needs a
  closer look" with no starting limit. Never replace a scan with filename-based guesses.

**Build**

1. Add `credit_reviews` with separate processing state and final result. Persist the run,
   document snapshot hashes, policy/model version, history reference, explanation and actual
   evidence reference. Proposed POST response is 202 with a run ID; GET includes processing
   state and, when finished, `raised`, `proposed`, `no_change` or `failed`.
2. Use the same evaluator for first applications and existing shippers. For new applicants,
   save the suggestion for a human `StartShipper` proposal; the current assistant methods
   require an already registered shipper. No first limit is activated automatically.
3. Paginate `list_shipments_by_shipper` for history and use live config/shipper views.
   The model extracts evidence and explains checks. Deterministic server policy validates
   its structured output and computes eligible amounts; the model cannot access keys/tools
   that write transactions. Treat document instructions as untrusted data.
4. Implement a bounded, durable runner over review rows with DB leases so process restarts
   do not lose accepted work. Do not introduce Redis or a separate queue service for these
   issues. Retry provider reads safely; reconcile uncertain writes before retrying them.
5. Implement `lib/near-ai.ts` against the documented gateway. Keep exact request/response
   bytes for digests and store real attestation/signature references privately. Define the
   proof policy and response fields before implementation. Missing or unverified evidence
   must be labeled honestly and must not trigger automatic limit changes under that policy.
   Reference: [NEAR AI response-signature verification](https://docs.near.ai/cloud/verification/cloud-api/response-signatures).
6. Serialize reviews per shipper. Before acting, reread the current limit, weekly window,
   caps, cooldown and known pending proposal. Use `assistant_set_limit` only within all
   current caps; otherwise use `assistant_propose`. Persist the actual receipt/proposal ID.
   A transaction failure produces `failed`, never `raised` or `proposed`.
7. Enforce decision 0003: no new review while a proposal waits for the team; after
   `no_change`, require three additional repaid bills. Compare fresh chain history to the
   prior review's reference. Enforce `blocked_until` after rejected assistant proposals.
8. Add owner/latest-review and team/review reads. Proof responses must not reveal raw
   financial documents, prompts, API keys or private signed URLs to other roles.

The current `list_proposals` returns at most 50 and has no cursor; expired proposals can
remain stored as Open until a vote checks expiry. Use exact stored proposal IDs and evaluate
TTL from config. Do not assume the newest 50 prove there is no older pending proposal.
Confirm a complete discovery strategy with Ancung before promising that guard across all
manual proposals; request a contract view only if the current interface cannot support it.

**Verify:** matching/mismatching/unreadable papers; malformed model output and injected
instructions; confidential-model capability check; provider timeout; actual proof unavailable;
no initial auto-approval; policy boundaries; weekly-cap equality; concurrent reviews;
cooldown; pending/expired/rejected proposals; three-more-repaid-bills gate; restarted runner;
and transaction success/failure reconciliation. Use a real SAMPLE-document review for the
external acceptance check, including a saved proof reference.

## #22: Team notes, jobs and emails

**Build**

1. Add `proposal_reasons` and `pause_notes`. Keep actor/time, reason code, private note
   and verified chain references. Require current team membership. A reject reason must
   match that member's actual rejecting vote; a pause note must match the finalized pause
   call. Define pending-note handling if frontend records a reason before its wallet action.
2. Separate public reason codes from private notes. The current `pause_shipper` stores
   its reason on NEAR; do not accidentally send a personal explanation as that argument.
3. Enumerate known shipper account IDs from the off-chain account/application registry,
   then paginate their shipments from NEAR. Filter status/due dates live rather than storing
   a trusted copy of bills. Include seed-created shippers in that registry with Ancung;
   there is no global shipper-list view to discover arbitrary accounts automatically.
4. Hourly late-bill job: recheck Paid shipments past due, call idempotent `mark_late`, then
   reconcile the result and deduplicate the notification. It must also recover an email
   missed after a previous successful mark. A direct internal job call can use the funded
   relayer account because `mark_late` allows anyone; it is never a public relay method.
5. Daily reminder job: specify UTC date/window semantics for "three days before". Recheck
   status immediately before sending. Track a reminder key per shipment, due date and
   recipient so restart/catch-up runs do not repeatedly send it.
6. Hourly invite job marks expired open rows. Endpoint checks remain authoritative for
   immediate expiry, and the job cannot overwrite an accepted invite in a race.
7. Reuse `email_log` for rejection, late and reminder messages, with queued/sent/failed
   state, attempt metadata, a unique event key and provider ID. Use provider idempotency
   when available; otherwise reconcile ambiguous timeouts rather than claiming exactly-once
   delivery. Retry failed sends without resending confirmed successful messages.
8. Add a small `job_runs`/lease migration for restart-safe progress and overlap protection.
   Schedule through one explicit runner mode, with a run-once command and injected clock
   for tests. Keep the later Railway scheduling configuration in #23.

**Verify:** team/outsider access; forged vote/pause references; private-note handling;
pagination over 50 shipments; exact due-date boundaries; repeat/overlap/restart runs;
repayment before execution; expiry/acceptance races; provider failure/uncertain response;
and every send attempt represented honestly in `email_log`.

## Data and configuration ownership

Create migrations incrementally and regenerate backend database types after each change.
Supabase RPC functions can implement atomic claims/leases; separate REST writes are not a
database transaction. External chain/storage/email side effects need resumable steps or
compensation rather than a long SQL transaction held across network requests.

| Introduced in | Data |
| --- | --- |
| #15 | `profiles` and baseline access policies |
| #18 | `invites` and atomic acceptance/provisioning reservation support |
| #16 | `auth_challenges`, private auth identity/provisioning records; recovery material only after the custody ADR |
| #17 | Minimal relay request/receipt deduplication records |
| #19 | `applications`, `application_documents`, private `documents` bucket, `email_log` |
| #21 | `reports`, `report_photos`, private `report-photos` bucket |
| #20 | `credit_reviews`, review claims and immutable proof references |
| #22 | `proposal_reasons`, `pause_notes`, `job_runs`/leases |

The accepted spec lists ten domain tables. Auth, relay and job bookkeeping above are
proposed additions and must be documented before their migrations. Avoid unnecessary new
databases, worker platforms, indexing services or payment APIs.

Configuration needed across the plan: all existing backend env names, plus proposed
`APP_URL`, `CORS_ORIGINS`, `JWT_ISSUER`, `JWT_AUDIENCE`, a recovery-encryption secret under
the approved custody design, `EMAIL_FROM`, `NEAR_AI_MODEL`, and explicit runner controls.
Use `.env.example` with empty values; document formats/defaults in the README. Never request
keys in chat. Select upload/PDF/email dependencies only after checking actual compatibility
and listing them in the owning PR. Use native Node crypto/fetch where they suffice.

## Decisions and integration gaps to resolve

| Item | Recommended next action | Needed before |
| --- | --- | --- |
| Recovery-key persistence vs current secret-location rule | Agree encrypted per-account custody and rotation in an ADR with the team. | #16 recovery/provisioning |
| Login challenge, role selection, invite optionality | Freeze bodies/nonce encoding, Google device binding and warehouse invite requirement with frontend. | #16 |
| Demo accounts and parent key | Ancung provisions the parent and agrees verified Sam/Jordan/Lena identity mapping and funding. | #16 testnet acceptance; seed stage 2 |
| Credit formula and supported currencies | Team supplies policy, version and expected examples; unclear evidence always goes to human review. | #20 automatic changes |
| Model/document/proof capabilities | Test a current confidential model with SAMPLE PDF and photo inputs; define acceptable evidence. | #19/#20 integration |
| Email provider and sender | Pick an available sender/provider and timeout/idempotency behaviour. | #19 rejection email |
| Proposal discovery beyond 50 results | Agree receipt/reference tracking or request an adequate view from Ancung. | #20 pending-proposal guarantee |
| Eight-character delivery code lookup | The contract and current API have no issuance/resolution interface. Define the owner/API separately before replacing the scanner demo; do not hardcode `7K2Q9F4M`. | Full frontend delivery integration |
| Network and shipment metadata | Agree how accepted invites map to destination IDs, and how names, phones, pickup/destination addresses and cargo descriptions reach authorized participants. These fields are not all in current API/ABI. | Full frontend network/trip integration |
| Live driver location | Product describes tracking, but #15-#22 and the API spec have no location-update/read interface. Assign a follow-up rather than treating the current demo map as live. | Full live-map integration |
| Custom settlement explanation | Decision 0003 requires a reason for a different payout, but `settle_report` accepts only amount and there is no backend reason route. Agree an off-chain persistence interface. | Full settlement UI integration |
| Document hashes on NEAR | Architecture says document hashes are recorded, but the current ABI has no application/document-hash argument. Store hashes privately under #19 and coordinate any additional chain proof with Ancung. | Claiming on-chain document proof |

These gaps do not block implementing #15. They do prevent claiming that completing the
listed backend endpoints alone connects every existing frontend screen. Do not silently
expand a relayer allowlist or store personal data on NEAR to work around a missing interface.

## Verification and handoff

For each issue, run targeted service/HTTP tests plus workspace lint, typecheck, tests and
format checks. Verify the backend production build whenever runtime imports or scripts
change. Run meaningful database integration checks on an isolated Supabase test setup for
migrations, atomic acceptance, leases, private storage and signed-link expiry. Ordinary CI
must remain runnable with mocked providers and no real keys; add required migration coverage
to CI as part of the backend work, with a reproducible local command.

Before closing the integrated flows, record these testnet checks with real receipt hashes:

1. Invite -> Google signup -> same account on repeat -> token registration -> acceptance ->
   shipper-signed network link. Replace the device and verify access through the new key.
2. Shipper-signed shipment -> signed pickup relay -> signed clean delivery -> actual token
   payout. A failed transfer must not be presented as successful payment.
3. Private report upload -> reproducible report hash -> relayed problem confirmation -> held
   payout -> shipper-signed settlement -> repayment, without copying balances into Supabase.
4. Application -> private documents -> real assistant result -> verified proposal link ->
   two team approvals -> active shipper. Exercise unreadable papers and rejection email.
5. Existing shipper review -> within-cap raise / team proposal / no change / failure, with
   current guardrails and a real proof reference.
6. Late/reminder/expiry jobs run twice and after restart. Verify live chain state and no
   duplicate confirmed emails; test time boundaries in an isolated test harness/sandbox.

Give frontend the shared types, examples of each success/error response, session and
challenge rules, upload fields/limits, proposal linkage steps and real proof/receipt fields.
Give Ancung the account/seed prerequisites and any confirmed missing contract view request.
Do not remove demo boundaries until the corresponding real integration has been verified.
Keep #23 deployment and its public-URL acceptance check outside this plan.
