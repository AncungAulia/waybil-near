# 0009: Durable Resend notifications

- Status: accepted
- Date: 2026-11-09

Use Resend for backend notifications, configured with `EMAIL_API_KEY` and a verified
`EMAIL_FROM`. Store an immutable message and unique event key before sending. A successful
response stores its provider ID; a failed email never rolls back an application decision.

Persist sending intent before the network request and reuse the same idempotency key on
retry. Resend retains these keys for 24 hours. Stop automatically retrying an ambiguous
request after 23 hours to leave a margin for reconciliation. An uncertain send is not marked
sent and must be checked with the provider before a person authorizes a new attempt. Known
successful sends are never resent by the worker. Missing provider configuration leaves mail
queued, with no fake provider ID or claim of delivery.
