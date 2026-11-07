# 0001 — One native Rust contract for shipments and the pool

- Status: accepted
- Date: 2026-11-07

## Context

Waybil tracks shipments and lends against confirmed deliveries from a pool.
On NEAR, calls between contracts are asynchronous: each one needs a callback,
and state can change between the call and the callback.

## Decision

- Write the contracts natively in Rust with `near-sdk`.
- Keep shipments and the lending pool in **one** contract (`contracts/waybil`).
- Use a separate NEP-141 token for test USDC (`contracts/mock-usdc`).
  Deposits and repayments arrive through `ft_transfer_call`.

## Consequences

- No cross-contract calls between shipment and pool logic, so fewer callbacks
  and fewer race conditions.
- Token transfers out of the contract (advances, withdrawals) still need
  callbacks that roll back state if the transfer fails.
- The contract is larger, so tests should cover each flow separately.
