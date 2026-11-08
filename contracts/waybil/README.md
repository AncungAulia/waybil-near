# Waybil contract

One Rust contract for shipments, credit limits, the investor pool and team votes.
The interface is `docs/specs/contract.md`. Change the spec before the code.

Will live at `app.waybil.testnet` (deploy script: issue #12).

## What is in this version

| Part | Methods |
|---|---|
| Init | `new(usdc, assistant, treasury, team)` with three different team accounts |
| Shippers | `add_driver`, `add_destination` |
| Shipments | `create_shipment`, `cancel_shipment`, `confirm_pickup`, `confirm_delivery` (pays the driver at once, or holds the payout when there is a problem), `settle_report`, `mark_late` |
| Pool | `ft_on_transfer` with msg `"deposit"` or `{"repay": id}`, `withdraw` (queue for what is lent out), `process_queue`, `claim_fees` (treasury) |
| Team | `propose` (`StartShipper`, `SetLimit`, `Unpause`, `CoverFromReserve`), `vote`, `pause_shipper` |
| Credit assistant | `assistant_set_limit`, `assistant_propose` |
| Callbacks | `on_payout`, `on_withdraw_sent`, `on_fees_sent` (private, roll back failed transfers) |
| Views | see the spec |

Next: team upgrades (#11) and the testnet deploy (#12).

## Build and test

```bash
cargo test                                         # unit tests (all platforms)
cargo near build non-reproducible-wasm --no-abi    # wasm in target/near/
cargo clippy --target wasm32-unknown-unknown --lib -- -D warnings
```

`tests/sandbox.rs` runs the whole flow against the real test USDC token in a local
sandbox. It builds `../mock-usdc` if needed. near-sandbox has no Windows build, so it runs
in CI on Linux. On low-memory machines use `CARGO_BUILD_JOBS=2`.
