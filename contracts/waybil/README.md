# Waybil contract

One Rust contract for shipments, credit limits, the investor pool and team votes.
The interface is `docs/specs/contract.md`. Change the spec before the code.

Will live at `app.waybil.testnet` (deploy script: issue #12).

## What is in this version

| Part | Methods |
|---|---|
| Init | `new(usdc, assistant, treasury, team)` with three different team accounts |
| Shippers | `add_driver`, `add_destination` |
| Shipments | `create_shipment`, `cancel_shipment`, `confirm_pickup`, `confirm_delivery` (pays the driver at once, or holds the payout when there is a problem) |
| Pool | `ft_on_transfer` with msg `"deposit"` |
| Team | `propose` (`StartShipper`, `SetLimit`, `Unpause`), `vote`, `pause_shipper` |
| Credit assistant | `assistant_set_limit`, `assistant_propose` |
| Callback | `on_payout` (private, rolls back a failed payout) |
| Views | see the spec |

Next: settling problem reports (#8), withdrawals, repayment and the reserve (#9),
team upgrades (#11).

## Build and test

```bash
cargo test                                         # unit tests (all platforms)
cargo near build non-reproducible-wasm --no-abi    # wasm in target/near/
cargo clippy --target wasm32-unknown-unknown --lib -- -D warnings
```

`tests/sandbox.rs` runs the whole flow against the real test USDC token in a local
sandbox. It builds `../mock-usdc` if needed. near-sandbox has no Windows build, so it runs
in CI on Linux. On low-memory machines use `CARGO_BUILD_JOBS=2`.
