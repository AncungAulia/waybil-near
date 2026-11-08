# Mock USDC

Test USDC for Waybil on NEAR testnet. NEP-141 with 6 decimals, plus a faucet.
It has no real value.

Deployed at `usdc.waybil.testnet` (owner `waybil.testnet`).

## Methods

| Method | Who | What |
|---|---|---|
| `new(owner_id)` | Init | Sets the owner and the metadata (Test USDC, USDC, 6 decimals) |
| `faucet()` | Anyone | Gives the caller 1,000 USDC once every 24 hours. Registers storage if needed. Fails with `E_FAUCET_TOO_SOON`. |
| `faucet_available_at(account_id)` | View | When the next claim is allowed, in nanoseconds. `0` means now. |
| `mint(account_id, amount)` | Owner | Mints test USDC, for the demo seed script. Fails with `E_NOT_OWNER`. |
| NEP-141 | Anyone | `ft_transfer`, `ft_transfer_call`, `ft_balance_of`, `ft_total_supply`, `ft_metadata` |
| NEP-145 | Anyone | `storage_deposit`, `storage_balance_of`, `storage_balance_bounds`, `storage_withdraw`, `storage_unregister` |

Every account that receives USDC must be registered first (`storage_deposit`), except
faucet and mint, which register automatically.

## Build and test

```bash
cargo test                                         # unit tests (all platforms)
cargo near build non-reproducible-wasm --no-abi    # wasm in target/near/
```

`tests/sandbox.rs` deploys the token to a local sandbox. near-sandbox has no Windows build,
so it only runs on Linux and macOS (CI runs it). ABI generation fails to link on Windows,
so build with `--no-abi` there.

## Deploy

```bash
near contract deploy usdc.waybil.testnet use-file target/near/mock_usdc.wasm \
  with-init-call new json-args '{"owner_id":"waybil.testnet"}' \
  prepaid-gas '30 Tgas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```
