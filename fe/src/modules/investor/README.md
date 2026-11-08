# Investor screens

Issue #30. The 14 I1–I3 states live in `components/InvestorScreen.tsx` with shared-type
Investor, Pool and Shipment fixtures in `data/fixtures.ts`.
Routes are `/pool`, `/pool/deliveries`, `/pool/deliveries/[id]` and `/pool/history`.
The gated gallery exposes every state, including a busy pool and a queued withdrawal.

This is a labeled local demo. No wallet, transfer, shares or real withdrawal queue is changed.
Deposit and withdrawal previews update `waybil-demo-pool-v1` in browser local storage.
Requests above the wallet balance or investor value are blocked. A withdrawal pays only the
free part and queues the rest in the local balance. The pure balance helper has tests for
micro-unit precision, partial withdrawals and repeated requests beyond the remaining value.
Historical activity and repayment earnings remain fixed examples until backend integration.

Delivery fee splits use `splitBill` from `@waybil/shared`. Where older drawings show 98%,
the UI follows the specified 97.5% driver rate. Proof links are labeled demos and point to the
real testnet account without inventing a transaction hash.
The deposit waiting fixture needs confirmation of the real NEP-141 signing and registration
steps before wallet integration. It does not implement an ERC-20 allowance.

No dependencies were added. Screenshots and validation are in `fe/review/investor-admin/`.
