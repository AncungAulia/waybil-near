# 0012 · Backend deployment guards

Status: accepted for testnet deployment.

The pre-deployment review on PR #56 found that unavailable integrations, rejected
transactions and uncontrolled account funding could interrupt ordinary users.

Production now requires explicit deployment origins and authentication credentials before
listening. SDK requests make one attempt with a bounded deadline. An ambiguous broadcast
retains its original bytes and signer fence; a definite transaction rejection ends that
intent. A deadline also prevents its unfinished operation from initiating a later SDK call.
An in-flight request cannot be assumed cancelled, so its recorded intent remains authoritative.

A newly provisioned Google account receives 0.005 NEAR for storage instead of 0.05 NEAR.
The relayer pays for allowed user actions. A durable global UTC-day reservation limits new
identity funding to GOOGLE_SIGNUP_DAILY_LIMIT (default 10); failures retain their reservation.
Operators can set zero to stop new provisioning. Parent spendable balance below 0.1 NEAR
produces a diagnostic and below 0.01 NEAR stops new creation. These are conservative testnet
operating limits, not economic estimates for mainnet.

Private credit checks have a one-day cooldown per shipper, including unclear outcomes.
Transient failures retry at most three times with at least a minute between attempts.
An interrupted initial check keeps the application available to the team. Chain approval
can reconcile the record independently of a successful assistant result. Approved shippers
can supply updated papers, including creating a missing off-chain company record.
Automatic limit writes remain disabled for the public deployment.

Emails stop on permanent provider rejection or after five attempts. Ambiguous delivery
retains its uncertainty and existing idempotency window. Shutdown waits for active work
for up to 25 seconds before forcing process exit. No money rule or contract interface changes.
