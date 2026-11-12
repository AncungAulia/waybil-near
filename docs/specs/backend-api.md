# Backend API spec · `be/`

Node.js + TypeScript + Express, deployed on Railway. Data in Supabase (Postgres + Storage).
The backend keeps **off-chain** data only. Money rules live in the contract
(`docs/specs/contract.md`). Change this file before the code.

Conventions:
- JSON over HTTPS. Base path `/v1`. Errors: `{ "error": { "code": "E_...", "message": "..." } }`.
- Auth header `Authorization: Bearer <session token>` (JWT, 7 days).
- File uploads use `multipart/form-data`, PDF/JPG/PNG, up to 2 MB per file.
- Request and response types live in `packages/shared` and are shared with the frontend.

## Runtime foundation (#15)

`GET /health` is public liveness and returns `{ "status": "ok" }` without calling providers.
The backend package is `@waybil/be` and defaults to port 4000. Browser origins are explicitly
listed in `CORS_ORIGINS` (comma separated); requests from other browser origins are rejected.
JSON bodies are limited to 64 KB. Errors use HTTP 400 (validation), 401 (session), 403 (access),
404 (missing), 409 (conflict), 413 (size), 429 (rate) and 503 (unavailable integration).
JWTs use HS256 with an explicit issuer/audience and a seven-day expiry. Every session loads
the profile and compares its session version. Team routes also verify membership on NEAR.
The health route works without provider secrets; protected features fail closed when their
required configuration is absent. No test login or client-controlled role bypass exists.

Off-chain domain tables store a validated JSONB `data` document, a text primary key and an
integer `version`. Services validate writes, and conditional versioned updates prevent lost
updates. Migrations add domain checks and unique indexes. Tables have RLS enabled with no
anonymous/authenticated policies; only the backend service role accesses them. No chain
balance or authoritative shipment-state table is created.

Additional runtime env: `APP_URL`, `CORS_ORIGINS`, `JWT_ISSUER`, `JWT_AUDIENCE`,
`TRUST_PROXY_HOPS`. Empty optional values disable the corresponding integration. `JWT_SECRET`
must contain at least 32 characters when supplied. Supabase URL and service-role key must
be supplied together. Defaults and feature setup are documented in `be/README.md`.

## Auth

`POST /v1/auth/challenge` accepts `{kind:"wallet",accountId,role?}` or
`{kind:"google",publicKey,inviteCode?}`. Wallet role is shipper/investor for a new account;
team membership is discovered from NEAR. Returns `{id,nonce,message,recipient,callbackUrl,
expiresAt}`. Nonces are 32 random bytes encoded as base64. Wallets sign the returned exact
NEP-413 payload, including callbackUrl, then send challengeId plus the existing wallet fields.
Google clients pass that nonce to GIS and POST `{challengeId,idToken}`. The public key and
invite are taken from the challenge, not replaced in the login body. Challenges last five
minutes and are consumed atomically before provisioning. An unsuccessful provisioning step
requires a fresh login attempt and resumes its existing identity/account.

Google identity is SHA-256 of `sub`, not email. Drivers can join without an invite; warehouse
accounts require a warehouse invite. Signup does not accept the invitation automatically.
Names default to a sanitized given name plus a subject-hash suffix; `GOOGLE_ACCOUNT_NAMES`
can map verified subject hashes to reserved demo slugs. A per-account full-access recovery
key is encrypted with AES-256-GCM and identity-bound AAD. Only its encryption secret lives
in environment settings. Recovery replaces the previous device key and increments the
profile session version. No role/account/identity changes are accepted by the profile route.
Profile update fields are name, E.164 phone, email and optional driver truckPlate. A plate is letters and numbers in up to four groups split by a space or a hyphen, with at least one of each, 2 to 15 characters (`isValidPlate` in `@waybil/shared`). It is stored upper case with single spaces, so "b 1234  eof" becomes "B 1234 EOF".

New env: `RECOVERY_ENCRYPTION_KEY` (base64 of 32 random bytes), `GOOGLE_ACCOUNT_NAMES`
(optional JSON object mapping subject hashes to account slugs). Account creation uses the
funded `users.waybil.testnet` signer, adds a role-restricted function-call key and registers
mock-USDC storage before issuing a session. No parent/admin key is returned to the browser.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/auth/wallet` | Wallet users | Body: NEP-413 signed message (`accountId`, `publicKey`, `signature`, `nonce`). Checks the key belongs to the account on chain. Returns a session. |
| POST | `/v1/auth/google` | Drivers, warehouses | Body: `challengeId`, Google `idToken`. The device public key and optional invite come from the challenge. Creates or recovers `<name>.users.waybil.testnet`, registers token storage and returns a session/profile. |
| GET | `/v1/me` | Signed in | Account, role, profile |
| PUT | `/v1/me/profile` | Signed in | Name, phone (WhatsApp), email |

The browser keeps the device key. The backend also adds a recovery key to each Google
account so a new phone can get a new device key after Google sign-in (see 0004).

## Relayer

Body is `{ signedDelegate: "<base64 Borsh SignedDelegate>" }`, at most 16 KB decoded.
Only canonical Ed25519 delegates with one function call and zero deposit are accepted.
Gas is at most 100 Tgas, expiry at most 200 blocks ahead, with a fresh access-key nonce.
The signer must be the session's current registered device key with the role's exact method.
Arguments must match the ABI. A problem confirmation requires a stored immutable report hash.
Before reports are integrated, that path returns unavailable rather than bypassing evidence.
Limit is 30 relay requests per minute per account, in addition to the global IP limit.

Responses contain `{txHash,status,proofUrl}`. Status is pending, confirmed or failed and refers
to transaction/receipt execution, not a guaranteed payout. Clients read the actual shipment
view for payment status. Pending returns HTTP 202. Retries of the same delegate use its
persisted original signed outer transaction and hash. A pending relayer transaction blocks
preparing another one until reconciled, avoiding fresh signatures with a stale relayer nonce.
No unsigned actions or internal job methods are exposed through this endpoint.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/relay` | Google users | Body: base64 signed delegate action (NEP-366). Checks: receiver is `app.waybil.testnet`, method is in the allow list (`confirm_pickup`, `confirm_delivery`), sender matches the session, rate limit per account. Sends it signed by `relayer.waybil.testnet`. Returns the transaction hash. |

## Invites

The implementation also provides owner-only `GET /v1/invites` returning `{ invites }`.
Codes are 24-character random hex strings. Public reads never return phone/address/contact
details. `shipperName` is the company name from the shipper's newest application that was
not rejected, taken when the invite is created. Before the shipper applies it is the account ID.
Acceptance is a conditional versioned update. Repeating acceptance by the same account
returns its original acceptance; another account receives 409. Google signup can reserve
an invitation for five minutes against a hashed Google subject, without consuming it.
Acceptance requires the same subject reservation while it is live. Expiry is checked
on each request, independently of the hourly cleanup. A used invitation stays used.
The response distinguishes acceptance from the subsequent shipper-signed network link.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/invites` | Shipper | Body: `type` (`driver` or `warehouse`), name, phone, destination address for warehouses. Returns a code and link. Expires in 7 days. |
| GET | `/v1/invites/:code` | Public | Shipper name, type, state (`open`, `used`, `expired`) |
| POST | `/v1/invites/:code/accept` | Google user | Marks it used. The shipper then calls `add_driver` or `add_destination` on chain (the frontend prompts them). |

## Public names and warehouse destinations

Shipments on chain hold account IDs only. These two reads let screens show names and let a
warehouse find its destinations, which the contract keeps per shipper.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/v1/profiles?ids=a,b` | Signed in | One to 50 account IDs, comma separated. Returns `ProfilesResponse` `{ profiles: [{ accountId, role, name }] }` for the accounts that have a profile. Unknown accounts are left out. Never returns phone, email or truck plate. `name` is the company name from the shipper's newest application that was not rejected, otherwise the profile name, otherwise empty. |
| GET | `/v1/me/destinations` | Warehouse | `WarehouseDestinationsResponse` `{ destinations: [{ id, shipperId, shipperName }] }`. The shippers come from the warehouse invites this account accepted, and each shipper's `get_network` gives the destinations that point to this account. A destination appears once the shipper has called `add_destination`. |

## Places and trips

Shippers save pickup points and receiving addresses as places with a pin on the map. A
shipment's trip joins a pickup place and the destination's place, keeps the road between
them, and holds the newest truck location the driver's phone sent. Types are in
`packages/shared/src/places.ts`. The contract is unchanged. Decision record 0014.

- Address search proxies Photon (`PHOTON_URL`, default `https://photon.komoot.io`, no key).
  It never calls public Nominatim, whose policy forbids search as you type.
- The road comes from OpenRouteService directions (`ORS_API_KEY`), truck profile first, then
  car, 8 seconds each. Without a key, or when both fail, the trip keeps a straight line with
  its haversine distance and `durationMin: null`, and `routeSource` is `straight`. The route
  is worked out once, when the trip is created.
- A warehouse invite can carry `placeId`, a destination place of the same shipper. Its
  address is copied from the place. The destination of shipment N is the place of the
  warehouse invite that shipper sent and the destination's warehouse accepted.
- Location sharing runs only while the shipment is `PickedUp` on chain. The driver's phone
  sends at most one point every 30 seconds (`LOCATION_EVERY_MS`). A closer point returns 429
  `E_RATE_LIMIT`. Only the newest point is kept. `recordedAt` in the future becomes now. A point
  older than 10 minutes (`LOCATION_STALE_MS`) shows as "Location paused" on screens.
- Demo simulation: with `DEMO_LOCATION_SIMULATION=on` a picked up trip also returns
  `simulation { startedAt, durationSec }`. `startedAt` is the pickup time on chain and
  `durationSec` is `DEMO_TRIP_SECONDS` (default 180). Screens move the truck along the route
  and label it "Demo · simulated location". The server never confirms a delivery by itself.
- Who sees a trip: the shipper, the shipment's driver, and the warehouse of its destination.
  Investors never see places, routes or locations.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/v1/places/search?q=` | Shipper | `q` is 3 to 200 characters. 30 requests a minute. Returns `PlaceSearchResponse` `{ results: [{ label, lat, lng }] }`, at most 5. The label joins name, street, city, state and country without repeats. Provider failure is 503 `E_UNAVAILABLE`. |
| GET | `/v1/places/reverse?lat=&lng=` | Shipper | The address at a pin the shipper moved, through Photon's reverse search. 30 requests a minute. Returns `PlaceReverseResponse` `{ result: { label, lat, lng } \| null }`. `lat` and `lng` are the pin's own, not the matched address's. Provider failure is 503 `E_UNAVAILABLE`. |
| GET | `/v1/places/route?from=&to=` | Shipper | The road between two of the shipper's own places, for the new shipment preview before a trip exists. Same routing and fallback as a trip. A road route is kept in memory per place pair. 30 requests a minute. Returns `RoutePreview` `{ route, routeSource, distanceKm, durationMin }`. Another shipper's place is 403. |
| GET | `/v1/places` | Shipper, warehouse | `PlacesResponse`. A shipper gets its own places. A warehouse gets the destination places of the invites it accepted. |
| POST | `/v1/places` | Shipper | Body `PlaceCreate`: kind, name (1 to 120), address (1 to 300), lat (-90 to 90), lng (-180 to 180). Returns 201 `{ place }`. |
| PUT | `/v1/trips/:shipmentId` | Shipper of the shipment | Body `TripCreate { pickupPlaceId }`. The pickup place must be the shipper's own `pickup` place. Works out the route and stores the trip. Repeating it with the same pickup returns the same trip. A different pickup on an existing trip is 409 `E_CONFLICT`. A destination with no place is 409 `E_NO_PLACE`. Returns `{ trip }`. |
| GET | `/v1/trips/:shipmentId` | Shipper, driver, warehouse | `{ trip }`. 404 when the shipment has no trip. |
| GET | `/v1/trips?ids=1,2` | Shipper, driver, warehouse | `TripsResponse` for up to 50 shipment IDs. Trips the caller may not see, or that don't exist, are left out. |
| POST | `/v1/trips/:shipmentId/location` | Driver of the shipment | Body `LocationUpdate { lat, lng, recordedAt? }`. 409 `E_NOT_ON_ROAD` unless the shipment is `PickedUp`. Returns `{ location }`. |

## Pool history

The contract keeps no list of an investor's past deposits and withdrawals, only its events
(`deposited`, `withdraw_paid`, `withdraw_queued`, `withdraw_failed`). The backend reads them from
the NearBlocks indexer (`NEARBLOCKS_API_URL`, v3) and keeps them in memory. A restart reads them
again. The free indexer plan allows a few calls a minute, so one scan runs at most once a minute
and opens at most 4 transactions. Older events fill in on later scans. Set `NEARBLOCKS_API_KEY`
for a higher limit. If the indexer fails before anything was loaded, the route returns 503
`E_UNAVAILABLE`. After that it serves what it has.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/v1/me/history` | Investor | `PoolHistoryResponse` `{ items: [{ kind, amount, shares, txHash, at }] }`, newest first. `kind` is `deposit`, `withdraw_paid`, `withdraw_queued` or `withdraw_failed`. `amount` is in USDC base units. `shares` is set for deposits. |

## Shipper applications

Company JSON is `{name,registration,country,province,city,address,postal,contact,job,phone,
email,trips,shippingSpend,routes}`. `shippingSpend` is a positive USDC base-unit string;
frontend converts its decimal spend field with `parseUsdc`. Registration is 13 digits,
phone is E.164, trips is a positive integer. One non-rejected application per shipper.
`PUT /v1/applications/:id` replaces company fields only in draft/needs_more states.
Document POST uses multipart `kind` (registration/bank_statement/tax_id) and `file`.
Files are inspected by byte signature, limited to 2,097,152 bytes, SHA-256 hashed and stored
privately. Document revisions retain their evidence records. Incomplete uploads are never
used by a review. Only owners and current team members receive five-minute signed links.
GET responses are `{application,documents}`; admin list is `{applications}` without file URLs.

Submission requires the two mandatory ready documents. It freezes the snapshot in_review,
increments submissionNumber and starts a durable evaluator. Repeated in_review submission
resumes the same submission. The first #19 branch returns unavailable until #20 supplies
that evaluator; it never invents a credit result. `POST /v1/admin/applications/:id/proposal`
accepts `{proposalId}` and verifies a matching StartShipper proposal. Approved state requires
its executed approval and an active contract shipper. An open proposal must be resolved by
team voting before rejecting the application through this API.

Rejection accepts `{reason,note}` (reason code, note up to 2,000 characters), persists the
decision and queues a deduplicated Resend email. Repeated identical rejection is idempotent.
`emailStatus` reports queued/sending/sent/failed/uncertain; an email problem does not undo the
rejection. `EMAIL_FROM` is the verified sending email. No email is sent without both sender
and EMAIL_API_KEY. Each transport attempt is recorded in email_log. Ambiguous sends may be
retried with the same Resend key for up to 23 hours; older ambiguity requires reconciliation.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/applications` | Shipper | Company details and shipping profile |
| POST | `/v1/applications/:id/documents` | Shipper | Upload `registration`, `bank_statement`, `tax_id` (optional). Stores the file and its sha256. |
| POST | `/v1/applications/:id/submit` | Shipper | Runs the credit assistant check, then the application waits for the team |
| GET | `/v1/applications/me` | Shipper | State: `draft`, `in_review`, `needs_more`, `approved`, `rejected` with reason |
| GET | `/v1/admin/applications` | Team | List with the assistant's result |
| GET | `/v1/admin/applications/:id` | Team | Full detail and short-lived file links |
| POST | `/v1/admin/applications/:id/reject` | Team | Reason chip and note. Emails the company. |

Approving is on chain: the member calls `propose(StartShipper{...})`. The backend stores the
proposal id on the application.

## Credit assistant

POST `/v1/credit/review` accepts an empty JSON object and queues a durable review, returning
202 `{review}`. Initial application submissions queue the same evaluator. Reviews expose
queued/running/writing/complete processing state separately from the final result
raised/proposed/no_change/failed. Latest reads are owner/team scoped. Additional
`GET /v1/credit/reviews/:id/proof` returns actual stored proof evidence to its owner/team.

`CREDIT_WORKER_ENABLED=true` enables the durable runner; `credit:once` processes one batch.
The runner validates actual file hashes, extracts searchable PDF text locally and sends
JPG/PNG as image input only to a configured model supporting it. Scanned/unreadable PDFs
need a clearer photo/searchable PDF and receive needs_more, never a guessed starting limit.
The model extracts names, registration, currency and three monthly outgoing amounts. Server
checks compare these to the form and compute amounts; document instructions cannot call tools.

No credit formula is enabled by default. `CREDIT_POLICY_JSON` is an explicit versioned policy
`{version,currency,outgoingFractionBps,usdcNumerator,usdcDenominator,maxLimit}`. Conversion ratio
is explicit (positive integer strings), and maxLimit is base units. Recommendation equals
floor(floor(sum(three monthly amounts)/3) * usdcNumerator * outgoingFractionBps /
(usdcDenominator * 10000)), capped at maxLimit. No exchange rate or coefficient is assumed.
`CREDIT_AUTO_LIMITS` defaults false; a missing formula or disabled automation produces no
automatic writes. Starting limits always remain suggestions for two team approvals.

The reviewed testnet preset is `be/src/config/credit-policy.testnet.json`: 20% of the
three-month mean outgoing payments, capped at 10,000 test USDC. It accepts USD statements
only, with one USD accounting unit mapped to one test USDC. This is an expenditure-based
recommendation for team review, not a validated repayment-capacity model or a live FX quote.
Other currencies require a separate reviewed conversion policy. The 2.5% shipment deduction
is independent of this coefficient and retains its existing pool/reserve/Waybil allocation.
The preset must still be explicitly copied into CREDIT_POLICY_JSON; no runtime fallback
silently enables it. See decision 0011 for rationale, limits and activation requirements.

Model config is `NEAR_AI_MODEL` (canonical ID), API key and `NEAR_AI_TRUSTED_SIGNERS_JSON`,
an array of `{model,publicKey,expiresAt}` for independently verified Ed25519 model signing
keys. Obtain/verify these using official NEAR AI verification tooling. The Node 22 adapter
records preflight evidence and verifies exact-byte provider_tee signatures against these
unexpired pins. Its proof mode is explicitly `pinned_model_signer`; it does not claim to
perform fresh Intel/NVIDIA hardware quote verification. Gateway-only/missing/invalid proofs
cannot authorize a limit write. Pin changes require operational review; there is no TOFU.

One active review per shipper is enforced. No-change decisions under a configured policy
require three additional Repaid shipment IDs before another review. Configuration-only
no-change results are not credit decisions. Pending proposals and contract cooldowns are
checked again before a write. Discover proposal IDs through the newest ID and read every
preceding ID (maximum 1,000); evaluate TTL even if stored status is Open. Incomplete history
fails unavailable rather than bypassing the pending-proposal gate. Writes persist their
original signed transaction before broadcast and reconcile it without signing a replacement.
An active review cannot start or sign a fresh limit change while the shipper is paused,
has counted late bills or has any Paid shipment past due, even before mark_late runs.
Existing signed intents continue reconciliation to preserve their actual outcomes.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/credit/review` | Shipper | Starts a review. Reads repayment history from the contract and the papers, sends them to NEAR AI Cloud, then calls `assistant_set_limit` or `assistant_propose`. |
| GET | `/v1/credit/reviews/me` | Shipper | Latest result (`raised`, `proposed`, `no_change`, `failed`), reasons, proof link |
| GET | `/v1/admin/credit/reviews/:shipper` | Team | The same for any shipper |

Result fields include the model's attestation reference for the "See proof" link.

## Problem reports

POST is multipart with a JSON `report` field `{shipmentId,goodQty,reasons,note}` and zero to
five `photos`. Reasons are damaged/missing/wrong_goods/other; a note is required (2,000 chars
max). Photos are detected JPG/PNG, 2 MiB each. Counts use the current shipment quantity.
Response is `{reportHash,confirmArgs:{id,good_qty,report_hash}}`; the warehouse still signs
the actual confirmation. Saving files never changes the shipment status or pays the driver.

Hash format v1 is SHA-256 of compact UTF-8 JSON with fields in this exact order:
`{version:1,shipmentId,warehouseId,goodQty,reasons,note,photos}`. Reasons are unique and sorted,
note is trimmed/NFC-normalized, photos preserve upload order as `{sha256,mime,size}`. The
hash excludes filenames, URLs and request time, so retrying identical content is stable.
Reports are immutable, including after a failed confirmation. Identical retries resume
incomplete uploads; changed content returns 409. Reads include signed photo links and a
`recorded` flag derived from the actual chain report hash. A mismatch is an integrity error.
The relayer verifies the stored ready report, hash, warehouse and quantity before sponsoring
a reported delivery. No report/folder/storage identifier is accepted as authorization.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/reports` | Warehouse | Shipment id, reasons, good count, note, photos. Stores everything and returns `reportHash` (sha256 over the JSON and photo hashes). The warehouse then calls `confirm_delivery` with that hash. |
| GET | `/v1/reports/:shipmentId` | Shipper, driver, warehouse, team of that shipment | Report, short-lived photo links |

## Team notes

Proposal reason POST accepts `{reason,note}` with reason too_big_jump/needs_history/
payment_risk/other. A current team member can record a reason only after their actual
reject vote is present in the proposal. One immutable reason per member/proposal; identical
retry returns the saved row. A reason by one voter does not reject the entire proposal.

Pause POST accepts `{shipperId,reason,note,txHash}`, with public reason code payment_risk/
late_bills/other and a private note up to 2,000 characters. Verify a finalized successful
direct `pause_shipper` transaction signed by the member, addressed to this contract, with
matching shipper/reason arguments. Private notes are never transaction arguments. Additional
team-only `GET /v1/admin/pauses/:shipper` lists recorded notes and real receipt references.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/admin/proposals/:id/reasons` | Team | Reason chip and note for a reject vote |
| GET | `/v1/admin/proposals/:id/reasons` | Team | All reasons for a proposal |
| POST | `/v1/admin/pauses` | Team | Reason note for a pause, after the on-chain call |
| GET | `/v1/admin/pauses/:shipper` | Team | Private pause history and receipt links |

## Jobs

`JOBS_WORKER_ENABLED=true` starts the private scheduler. `jobs:once` runs all jobs without
opening an HTTP listener. No public job-trigger route exists. Late/expiry jobs have UTC
hour windows; reminders have UTC day windows. Complete windows are not repeated; failed
ones can resume under renewed database leases. Pending signed transactions and email rows
survive process restart. Internal mark_late transactions share the relayer signer queue,
including its persisted original transaction and pending-nonce fence; the public relay
allowlist remains pickup/delivery only.

Leases renew every minute for up to five minutes at a time. A failed renewal or expired
local deadline blocks subsequent database, storage, signing and email side effects. Renewal
requires the same live owner and cannot revive an expired lease. A definitively failed late
transaction may be signed again; the failed receipt/bytes remain in its attempt history.

Shippers come from profiles/applications plus approved StartShipper proposals, discovered
through bounded complete proposal-ID scans. All shipments are paginated and read fresh.
Only Paid bills past due are marked; the live record is reread before notification. Reminders
normally send three UTC dates before the due date, with catch-up on days one/two if a run
was missed. Event keys include shipment, due date and recipient, never the scheduler window.
The email worker rechecks bill state before sending a queued late/reminder message and
suppresses stale mail. Missing recipient data is counted, never guessed. Unknown delivery
outcomes remain uncertain rather than being labeled cancelled or sent.

The expiry job marks expired open invitations using conditional versions, removes expired
login challenges and retries explicitly flagged document-upload cleanup under its application
lease. Ready document revisions and report evidence are retained. Rejection emails are
recovered from rejected application rows if a crash occurred before email queue insertion.
Every job window stores counts/attempts/state in job_runs. Missing credentials do not count
as an executed transaction or a sent email. Live deployment/scheduler setup remains #23.

| Job | When | What |
|---|---|---|
| Late bills | Every hour | Calls `mark_late` for unpaid bills past their due date, emails the shipper |
| Reminders | Daily | Emails shippers 3 days before a due date |
| Expiry | Every hour | Marks expired invites |

## Database tables (Supabase)

`profiles`, `invites`, `applications`, `application_documents`, `credit_reviews`,
`reports`, `report_photos`, `proposal_reasons`, `pause_notes`, `email_log`,
`auth_challenges`, `auth_identities`, `relay_requests`, `work_leases`, `job_runs`, `places`, `trips`.
Storage buckets `documents` and `report-photos` are private. Links are signed and short-lived.

## Env (`be/.env.example`)

`PORT`, `NEAR_NETWORK`, `NEAR_RPC_URL`, `WAYBIL_CONTRACT`, `USDC_CONTRACT`,
`RELAYER_ACCOUNT`, `RELAYER_PRIVATE_KEY`, `USERS_ACCOUNT`, `USERS_PRIVATE_KEY`, `ASSISTANT_ACCOUNT`, `ASSISTANT_PRIVATE_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`,
`NEAR_AI_API_KEY`, `NEAR_AI_MODEL`, `NEAR_AI_TRUSTED_SIGNERS_JSON`, `CREDIT_POLICY_JSON`,
`CREDIT_AUTO_LIMITS`, `CREDIT_WORKER_ENABLED`, `JOBS_WORKER_ENABLED`, `EMAIL_API_KEY`,
`EMAIL_FROM`, `NEARBLOCKS_API_URL` (default `https://api-testnet.nearblocks.io`),
`NEARBLOCKS_API_KEY` (optional), `PHOTON_URL` (default `https://photon.komoot.io`), `ORS_API_KEY`
(optional), `DEMO_LOCATION_SIMULATION` (`on` or off), `DEMO_TRIP_SECONDS` (default 180). Additional auth/origin configuration is listed in `be/.env.example` and the
feature sections above.

## Production safety and diagnostics

Production startup requires explicit JWT, Supabase, recovery encryption, Google client,
relayer/users signing keys, APP_URL, CORS_ORIGINS and TRUST_PROXY_HOPS. APP_URL and all
browser origins must use HTTPS. Missing configuration stops startup before /health is
available. Development may still start with integrations disabled. Browser origins are
normalized to URL origins, including inputs with a trailing slash.

Server diagnostics contain only an operation, error class/code, route template and known
transaction hash where applicable. They never include exception messages, request bodies,
query strings, headers, credentials or personal data.

Google provisioning reserves a durable daily slot under a global lease before funding a
new identity. GOOGLE_SIGNUP_DAILY_LIMIT defaults to 10 (UTC); zero disables new signups.
Reservations count even if provisioning fails, and retries of an identity reuse its slot
on that date. Accounts receive 0.005 NEAR for storage; gas is sponsored separately. The
parent's spendable balance is checked and low funds produce a safe operational diagnostic.
POST /v1/auth/logout revokes every existing session for the account by incrementing its
session version. The device's on-chain key remains subject to the normal recovery flow.
SDK RPC requests make one attempt, and integration operations have a 15-second deadline.
Timeouts remain ambiguous and must be reconciled before another signed intent is prepared.

A definite RPC transaction rejection (including invalid nonce, expired transaction and
insufficient balance) completes the saved intent as failed and releases the signer queue.
Transport failures, timeouts and unknown execution remain pending. Signer contention returns
503 E_SIGNER_BUSY with a retry message rather than a client edit conflict. A finalized false
function result is failed, including mark_late returning false; incomplete outcomes stay pending.

Application reads do not acquire a write lease. Approval is reconciled using a conditional
version update after checking the live shipper; concurrent edits do not fail the whole list.
A matching executed proposal may be linked after an interrupted initial check, including a
draft or needs_more row. An active shipper may create its missing off-chain company record
and replace ready papers on an approved record for a subsequent credit review. Existing review
snapshots remain immutable. These operations never register a shipper or change a chain limit.

Malformed multipart bodies return 400 E_VALIDATION. Email delivery stops after a definite
non-retryable 4xx or five attempts. Rate limits, 5xx and ambiguous transport outcomes may retry
with the same idempotency key within the existing 23-hour window; unresolved ambiguity ends
as uncertain. Permanently failed rows remain available for operational inspection.

Explicit limit-review requests have a 24-hour per-shipper cooldown, including failed/unclear
results. Initial checks are keyed by submissionNumber and can run on the same day after
corrected papers are resubmitted from needs_more. Repeating the same submission returns its
existing review. Transient
provider, storage and configuration failures keep the review queued, retry no sooner than
60 seconds, and stop after three processing attempts. Failed initial checks leave the
application in_review for team handling, rather than silently returning it to draft.
The admin applications list adds `review: CreditReviewInfo | null` to each application;
private raw model evidence is available only through its existing authorized proof route.

Shutdown stops new scheduler ticks and HTTP accepts, then awaits current HTTP requests and
worker promises for up to 25 seconds. Lease release runs before a normal process exit. A
drain timeout is logged and remaining HTTP connections are closed. Expired auth challenges
are removed by one database delete on their UTC expiry field, backed by an expiry index.
Unknown admin routes return 404; authentication is applied only to registered admin routes.

## Error code registry

`ErrorCode` is the closed set of keys in shared `HTTP_ERRORS`. Routes retain their documented
HTTP status; internal job/email rows may also store these codes. Responses use a plain message
with no provider payload. Default messages are listed below.

| Code | Default message |
|---|---|
| `E_VALIDATION` | Check the information and try again. |
| `E_SESSION` | Please sign in again. |
| `E_ACCESS` | You do not have access to this action. |
| `E_NOT_FOUND` | This item could not be found. |
| `E_CONFLICT` | This item changed. Please refresh and try again. |
| `E_UNAVAILABLE` | This service is unavailable. Please try again later. |
| `E_INTERNAL` | Something went wrong. Please try again. |
| `E_TOO_LARGE` | Use a file up to 2 MB, or take a smaller photo. |
| `E_RATE_LIMIT` | Please wait before trying again. |
| `E_NO_PLACE` | Pick this destination on the map first. |
| `E_NOT_ON_ROAD` | Location is shared only while the truck is on the road. |
| `E_ACCOUNT_CONFIG` | Account setup is unavailable. Please try again later. |
| `E_AI` | The private check could not finish. Please try again later. |
| `E_AI_PROOF` | The private check could not be verified. |
| `E_AI_TRUST` | The private check is not ready. |
| `E_ALREADY_CONFIRMED` | This delivery has already been confirmed. |
| `E_CREDIT_COOLDOWN` | The team asked for more time before another review. |
| `E_CREDIT_HISTORY` | Pay three more bills before asking for another review. |
| `E_CREDIT_OVERDUE` | Pay your overdue bills before asking for another review. |
| `E_CREDIT_PAUSED` | The team must resume your company before another review. |
| `E_CREDIT_PENDING` | The team is still reviewing a limit change. |
| `E_CREDIT_POLICY` | The credit policy is unavailable. |
| `E_CREDIT_RATE` | Please wait one day before asking for another private check. |
| `E_DATABASE` | Your information could not be saved. Please try again. |
| `E_DELEGATE` | This delivery request could not be read. |
| `E_DELEGATE_EXPIRED` | Refresh this delivery request and try again. |
| `E_EMAIL_CANCELLED` | This notification is no longer needed. |
| `E_EMAIL_PERMANENT` | This email could not be sent. The team must check its settings. |
| `E_EMAIL_RETRIES` | This email needs the team to check its delivery status. |
| `E_EMAIL_SEND` | Email delivery could not finish. |
| `E_EMAIL_SUPERSEDED` | This notification changed while its delivery was uncertain. |
| `E_EMAIL_UNCERTAIN` | Email delivery has not been confirmed. |
| `E_FILE_TYPE` | Use a PDF, JPG or PNG file. |
| `E_INVITE_EXPIRED` | This invitation has expired. |
| `E_INVITE_USED` | This invitation has already been used. |
| `E_JOB` | A scheduled task could not finish. |
| `E_LATE_PENDING` | A late bill is still being recorded. |
| `E_LEASE_LOST` | This request stopped. Please try again. |
| `E_PAPERS` | Upload a clear photo or a searchable PDF. |
| `E_RECEIPT` | This approval record could not be read. |
| `E_RELAY_PENDING` | A delivery request is still being recorded. Please try again shortly. |
| `E_REPORT_INTEGRITY` | This delivery report could not be verified. |
| `E_REPORT_REQUIRED` | Save a problem report before confirming this delivery. |
| `E_ROLE_REQUIRED` | Choose your role to continue. |
| `E_RPC` | The delivery record could not be reached. Please try again. |
| `E_RPC_TIMEOUT` | The delivery record took too long. Please try again. |
| `E_SHUTDOWN_TIMEOUT` | The service could not finish its work before stopping. |
| `E_SIGNATURE` | This delivery request could not be verified. |
| `E_SIGNER_BUSY` | Another request is being recorded. Please try again shortly. |
| `E_SIGNUP_CAP` | Account setup is busy today. Please try again tomorrow. |
| `E_SIGNUP_FUNDS` | Account setup is temporarily unavailable. Please try again later. |
| `E_STORAGE` | Your file could not be saved. Please try again. |
| `E_TX_REJECTED` | This request was not recorded. Please try again. |
