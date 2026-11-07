# 0002 — Admin multisig and credit agent rules

- Status: accepted
- Date: 2026-11-08

## Context

The credit agent proposes limit changes and starting limits for new shippers.
Changes above the agent's cap need the team. We need clear voting rules before
building the contract, backend, and admin UI.

## Decision

**Voting (2 of 3 team members, inside the waybil contract, see 0004)**

| Votes | Result |
|---|---|
| 2 approve | Passes and executes |
| 2 reject | Closed (rejected) |
| 1 approve + 1 reject | Still open; the third member decides |
| Not enough votes within 7 days | Expired (treated as closed) |

- One rejection never closes a proposal on its own.
- Signers are separate NEAR accounts, shown by role in the UI:
  Risk lead (`risk.waybil.near`), Operations (`ops.waybil.near`),
  Finance (`finance.waybil.near`). The UI never shows team members' real names.

**Rejection reasons**

- Rejecting requires a reason in the UI: a quick pick (Too big a jump,
  Needs more history, Payment risk, Other) plus an optional note.
- The on-chain vote is just "Reject". The reason is stored by the Waybil backend,
  shown to the team, and sent to the company when a shipper application is rejected.

**Credit agent guardrails (enforced by the contract)**

- The agent can propose but never vote.
- Within caps it acts alone: max limit per shipper 10,000 USDC, max raise 20% per week.
- Anything above the cap becomes a multisig proposal.
- After a proposal closes as rejected, the agent can't propose the same change
  for the same shipper for 7 days.

**Shipper documents and assistant mistakes**

- Shippers upload business registration and a 3-month bank statement (tax ID optional),
  PDF or photo, up to 2 MB each. Files are stored by the backend, never shown to investors.
- The assistant only does narrow checks a person can verify: name and registration
  number match the form, and average monthly outgoing payments from the statement.
- If any check fails or a file can't be read, the assistant marks it
  "Needs a closer look" and gives no starting limit. The team opens the files and decides.
- A starting limit always needs 2 of 3 team approvals, so a wrong read can't go live on its own.
- Demo: we make our own sample documents for fictional companies, marked "SAMPLE",
  and the seed script uploads them.

## Consequences

- Contract: store the agent's last rejected proposal per shipper and block
  repeats for 7 days; expose caps as owner-settable values.
- Backend: endpoint to save and read rejection reasons keyed by proposal id;
  notify rejected applicants.
- Design: admin screens M1.1–M1.7 (approvals, incl. reject, split vote, rejected, expired),
  M2.1–M2.10 (shippers, incl. decide dialog, active detail, empty states, needs a closer look),
  M3.1–M3.4 (pool, incl. empty, bill overdue, almost all lent out);
  shipper onboarding C5.1–C5.2 (documents).
