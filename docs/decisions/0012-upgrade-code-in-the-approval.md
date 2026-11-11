# 0012 — Team upgrades send the code with the second approval

- Status: accepted
- Date: 2026-11-11
- Changes: 0005 (how the code reaches the contract)

## Context

Decision 0005 planned a `stage_code()` call that stores the new wasm in the contract before
the vote. The contract is about 300 KB. On NEAR every 100 KB of storage locks about 1 NEAR,
so staging would lock about 3 NEAR more on `app.waybil.testnet`, which only has about
0.3 NEAR free. The team accounts hold 0.2 NEAR each.

## Decision

- The proposal stores only the code hash: `propose(Upgrade{code_hash})`.
- The second member approves with `approve_upgrade(id, code)` and sends the wasm in the
  transaction input. The input is borsh (`id` as u64, then the wasm as length-prefixed
  bytes), not JSON, so the proposal id and the bytes travel together without base64. The
  contract checks `sha256(code) == code_hash`, records the vote, and deploys the code to
  itself and calls `migrate()` in one batch.
- `vote(id, true)` can't be the second approval of an upgrade, because the code must come
  with it. Rejections still use `vote`.

## Consequences

- No extra storage. The deployed code is replaced, so storage changes only by the size
  difference.
- The rule stays the same: 2 of 3 members, and the hash is checked against a reproducible
  build before anyone approves.
- If `migrate` fails, the batch rolls back and the old code stays, but the proposal is
  already `Approved`. The team proposes again with fixed code.
