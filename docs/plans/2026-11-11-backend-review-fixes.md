# Backend pre-deployment review follow-up

Source: [PR #56 review](https://github.com/AncungAulia/waybil-near/pull/56#issuecomment-6773561501).
Scope: the eight open backend PRs #55–#62, their review comments and issues #15–#23.
No additional comments were present on issues #15–#23 when checked.

## Required findings

| Finding | Resolution |
|---|---|
| Zero SDK attempts | One actual attempt; real-SDK HTTP regression test and read-only testnet smoke call. |
| Rejected intents hold signer queues | SDK transaction rejections complete relay/credit intents as failed; ambiguous transport remains pending. |
| Read requests compete for leases | Application reads use optimistic approval reconciliation without write leases. Concurrent read regression test added. |
| Initial check strands applications | Transient errors queue bounded retries; failed initial checks stay in_review. Live chain approval can reconcile draft/needs_more rows. |
| Production starts without configuration | Explicit required credentials, HTTPS origins and proxy setting validated before listening. |
| Google funding drain | 0.005 NEAR seed, durable global daily reservation cap, spendable-balance diagnostics and minimum-funds gate. |
| Missing diagnostics | Safe structured HTTP, RPC, reconciliation, queue, worker and email errors. No raw messages or request/provider payloads. |

## Additional functional findings

| Finding | Resolution |
|---|---|
| Concurrent relays return edit conflicts | Signer lease contention returns 503 E_SIGNER_BUSY with a retry message. |
| Hung SDK requests | Per-request and enclosing-operation deadlines; continued operations cannot start more SDK calls after timeout. In-flight broadcasts remain ambiguous. |
| Shutdown ignores active workers | Stop scheduling, await HTTP/worker promises, bound drain at 25 seconds. |
| Email retries never stop | Permanent 4xx stops; retryable/ambiguous attempts capped at five, preserving uncertainty and idempotency. |
| Paid review loops | One-day shipper cooldown, including initial resubmissions and unclear results. |
| Unsafe automatic raises | Public deployment keeps CREDIT_AUTO_LIMITS=false; no financial rules changed. |
| Old papers / seed accounts | Active shippers can create a missing company record and replace approved papers. Review snapshots remain immutable. |
| Missing admin assistant result | Each list row includes the latest public CreditReviewInfo, excluding private evidence. |
| Multipart parser failures | 400 E_VALIDATION; HTTP regression test. |
| Session revocation | POST /v1/auth/logout increments sessionVersion. |
| Expired challenge scans | Single database delete with an expiry index in migration 009. |
| mark_late false | Shared receipt parser reports false as failed. |
| Origin trailing slash | Origins normalized to URL.origin. |
| Node major | Backend engines pin >=22.22.2 <23; Railway Node 22 setting documented. |
| GCM tag length | AES-GCM decryption explicitly requires a 16-byte authentication tag. |
| Shared response types | Response wrappers, rejection reason tuple/type and closed error-code registry added. |
| Unknown admin routes | Only registered routes run authentication, so unmatched paths return 404. |
| email_key_idx | Retained intentionally: it is a unique index enforcing event uniqueness, not just a query optimization. |
| Outdated contract fields | Spec names corrected to raise_window_start / raise_window_base; contract code unchanged. |
| Test coverage | HTTP application/report/credit checks, transient recovery, concurrent reads, shutdown and real Supabase client operations against a PGlite-backed test transport. |

## Tidiness

Transaction signing/status/outcomes now share near-tx.ts, including pause proof parsing.
Proposal and shipment scans share contract-reads.ts with common bounds. Public credit
projection, worker lifecycle and bootstrap have dedicated helpers. Unused createRoutes,
runtime return fields and idParam were removed. Report/admin clocks are injectable. The
closed shared HTTP_ERRORS registry documents every current backend code in the API spec.

The optional full decomposition of credit work(), a typed facade for every contract view,
and moving all numeric constants/validators are not required for deployment and remain
future refactoring. Existing tests cover their current behavior.

## Verification and deployment boundary

Local validation: 100 backend tests, 17 frontend tests and 6 shared tests, workspace
lint/typecheck/format checks, backend production build. A real provider read testnet block
277162533 without signing or sending transactions. Built server smoke checks reject missing
production credentials, serve development /health, and stop cleanly after SIGTERM.

Apply migration 009 after 001–008 before deploying these changes. No live database migration,
contract write, email delivery, deployment, PR merge or main push was performed during this
follow-up. Local .env remains ignored and was not included in commits.

Vercel previously reported missing team membership for the commit author. That access issue
requires the project owner; changing repository visibility or a paid plan is outside this
backend code fix. Frontend API integration and Railway publication remain separate owner/
deployment work; issue #23 is not marked complete by this review pass.
