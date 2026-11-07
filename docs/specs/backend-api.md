# Backend API spec · `be/`

Node.js + TypeScript + Express, deployed on Railway. Data in Supabase (Postgres + Storage).
The backend keeps **off-chain** data only. Money rules live in the contract
(`docs/specs/contract.md`). Change this file before the code.

Conventions:
- JSON over HTTPS. Base path `/v1`. Errors: `{ "error": { "code": "E_...", "message": "..." } }`.
- Auth header `Authorization: Bearer <session token>` (JWT, 7 days).
- File uploads use `multipart/form-data`, PDF/JPG/PNG, up to 2 MB per file.
- Request and response types live in `packages/shared` and are shared with the frontend.

## Auth

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/auth/wallet` | Wallet users | Body: NEP-413 signed message (`accountId`, `publicKey`, `signature`, `nonce`). Checks the key belongs to the account on chain. Returns a session. |
| POST | `/v1/auth/google` | Drivers, warehouses | Body: Google ID token, `publicKey` made in the browser, `inviteCode`. First time: creates `<name>.waybil.testnet` with that key as a function-call key for `app.waybil.testnet`. Returns the account and a session. |
| GET | `/v1/me` | Signed in | Account, role, profile |
| PUT | `/v1/me/profile` | Signed in | Name, phone (WhatsApp), email |

The browser keeps the device key. The backend also adds a recovery key to each Google
account so a new phone can get a new device key after Google sign-in (see 0004).

## Relayer

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/v1/relay` | Google users | Body: base64 signed delegate action (NEP-366). Checks: receiver is `app.waybil.testnet`, method is in the allow list (`confirm_pickup`, `confirm_delivery`), sender matches the session, rate limit per account. Sends it signed by `relayer.waybil.testnet`. Returns the transaction hash. |

## Invites

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
`RELAYER_ACCOUNT`, `RELAYER_PRIVATE_KEY`, `ASSISTANT_ACCOUNT`, `ASSISTANT_PRIVATE_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`,
`NEAR_AI_API_KEY`, `EMAIL_API_KEY`.
