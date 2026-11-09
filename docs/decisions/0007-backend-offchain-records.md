# 0007: Versioned backend records

- Status: accepted for the backend implementation
- Date: 2026-11-09

The backend keeps off-chain workflows in separate domain tables with an `id`, a JSONB
`data` document and a monotonic `version`. Services own typed data and validate inputs.
Migrations enforce identity, required domain fields, unique relationships and access rules.
Conditional updates match the previous version, so concurrent writers receive a conflict
instead of losing a change. Atomic claims use server-side SQL functions where necessary.

This keeps Supabase transport separate from feature services and permits testing the same
service logic with an injected store. SQL migrations are exercised on isolated PostgreSQL
semantics through PGlite. RLS denies client access; the API performs participant checks before
using the service-role client. Balances, delivery status, limits and votes remain on NEAR.

Database updates and external transactions are not atomic together. Provisioning, broadcast
and notification work must persist intent before a side effect and reconcile uncertain
results. A version conflict is never a reason to repeat an external payment or approval.
