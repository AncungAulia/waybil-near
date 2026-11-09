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
Profile update fields are name, E.164 phone, email and optional driver truckPlate.

New env: `RECOVERY_ENCRYPTION_KEY` (base64 of 32 random bytes), `GOOGLE_ACCOUNT_NAMES`
(optional JSON object mapping subject hashes to account slugs). Account creation uses the
funded `users.waybil.testnet` signer, adds a role-restricted function-call key and registers
mock-USDC storage before issuing a session. No parent/admin key is returned to the browser.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/auth/wallet` | Wallet users | Body: NEP-413 signed message (`accountId`, `publicKey`, `signature`, `nonce`). Checks the key belongs to the account on chain. Returns a session. |
| POST | `/v1/auth/google` | Drivers, warehouses | Body: Google ID token, `publicKey` made in the browser, `inviteCode`. First time: creates `<name>.users.waybil.testnet` (signed by `users.waybil.testnet`) with that key as a function-call key for `app.waybil.testnet`, and registers the account on `usdc.waybil.testnet` (`storage_deposit`) so payouts can reach it. Returns the account and a session. |
| GET | `/v1/me` | Signed in | Account, role, profile |
| PUT | `/v1/me/profile` | Signed in | Name, phone (WhatsApp), email |

The browser keeps the device key. The backend also adds a recovery key to each Google
account so a new phone can get a new device key after Google sign-in (see 0004).

## Relayer

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/relay` | Google users | Body: base64 signed delegate action (NEP-366). Checks: receiver is `app.waybil.testnet`, method is in the allow list (`confirm_pickup`, `confirm_delivery`), sender matches the session, rate limit per account. Sends it signed by `relayer.waybil.testnet`. Returns the transaction hash. |

## Invites

The implementation also provides owner-only `GET /v1/invites` returning `{ invites }`.
Codes are 24-character random hex strings. Public reads never return phone/address/contact
details. `shipperName` uses the account ID until the shipper publishes a company name.
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

## Shipper applications

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

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/credit/review` | Shipper | Starts a review. Reads repayment history from the contract and the papers, sends them to NEAR AI Cloud, then calls `assistant_set_limit` or `assistant_propose`. |
| GET | `/v1/credit/reviews/me` | Shipper | Latest result (`raised`, `proposed`, `no_change`, `failed`), reasons, proof link |
| GET | `/v1/admin/credit/reviews/:shipper` | Team | The same for any shipper |

Result fields include the model's attestation reference for the "See proof" link.

## Problem reports

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/reports` | Warehouse | Shipment id, reasons, good count, note, photos. Stores everything and returns `reportHash` (sha256 over the JSON and photo hashes). The warehouse then calls `confirm_delivery` with that hash. |
| GET | `/v1/reports/:shipmentId` | Shipper, driver, warehouse, team of that shipment | Report, short-lived photo links |

## Team notes

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/admin/proposals/:id/reasons` | Team | Reason chip and note for a reject vote |
| GET | `/v1/admin/proposals/:id/reasons` | Team | All reasons for a proposal |
| POST | `/v1/admin/pauses` | Team | Reason note for a pause, after the on-chain call |

## Jobs

| Job | When | What |
|---|---|---|
| Late bills | Every hour | Calls `mark_late` for unpaid bills past their due date, emails the shipper |
| Reminders | Daily | Emails shippers 3 days before a due date |
| Expiry | Every hour | Marks expired invites |

## Database tables (Supabase)

`profiles`, `invites`, `applications`, `application_documents`, `credit_reviews`,
`reports`, `report_photos`, `proposal_reasons`, `pause_notes`, `email_log`.
Storage buckets `documents` and `report-photos` are private. Links are signed and short-lived.

## Env (`be/.env.example`)

`PORT`, `NEAR_NETWORK`, `NEAR_RPC_URL`, `WAYBIL_CONTRACT`, `USDC_CONTRACT`,
`RELAYER_ACCOUNT`, `RELAYER_PRIVATE_KEY`, `USERS_ACCOUNT`, `USERS_PRIVATE_KEY`, `ASSISTANT_ACCOUNT`, `ASSISTANT_PRIVATE_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`,
`NEAR_AI_API_KEY`, `EMAIL_API_KEY`.
