# Contract spec · `app.waybil.testnet`

One Rust contract (near-sdk 5.x) for shipments, credit, the pool and team votes.
Rules come from `docs/decisions/0002`, `0003` and `0004`. Change this file before the code.

Conventions:
- Amounts are `U128` in USDC base units (6 decimals). `300.00 USDC` = `"300000000"`.
- Times are `u64` nanoseconds (`env::block_timestamp()`). Days = `86_400 * 10^9` ns.
- Shares and fees use basis points (`bps`, 10,000 = 100%).
- Errors are `require!` panics with a short message starting with `E_`, for example `E_OVER_LIMIT`.
- Every state change emits a NEP-297 event: `{"standard":"waybil","version":"1.0.0","event":...,"data":[...]}`.

## Init and config

```rust
#[init]
fn new(usdc: AccountId, assistant: AccountId, treasury: AccountId,
       team: Vec<AccountId>) -> Self   // team must have 3 members
```

| Config (team can change by proposal) | Default |
|---|---|
| `driver_bps` | 9750 |
| `pool_bps` / `reserve_bps` / `waybil_bps` | 160 / 40 / 50 (sum with driver_bps = 10,000) |
| `max_limit` | 10,000 USDC |
| `assistant_raise_bps` (per 7 days) | 2000 |
| `max_share_bps` (one shipper vs pool size) | 2500 |
| `max_due_days` | 60 |
| `reserve_cover_after_days` | 14 |
| `proposal_ttl_days` / `reject_cooldown_days` | 7 / 7 |

## State

```rust
struct Shipper { limit: U128, owed: U128, committed: U128, paused: Option<String>,
                 late_bills: u32, last_raise_at: u64, raised_in_window: U128,
                 blocked_until: u64 }      // assistant cooldown after a rejection
struct Destination { id: u32, shipper: AccountId, warehouse: AccountId }
enum Status { Approved, PickedUp, Reported, Paid, Repaid, Cancelled, CoveredByReserve }
struct Shipment {
  id: u64, shipper: AccountId, driver: AccountId, destination: u32,
  qty: u32, unit: String,              // "boxes", "kg", "pallets"
  bill: U128, advance: U128,           // advance = bill * driver_bps
  due_at: u64, status: Status,
  approved_at: u64, picked_up_at: Option<u64>, arrived_at: Option<u64>,
  good_qty: Option<u32>, report_hash: Option<String>,   // sha256 of report + photos
  paid_at: Option<u64>, repaid_at: Option<u64>,
  marked_late: bool,                   // counted in the shipper's late_bills
}
struct Pool { total_shares: U128, cash: U128, lent: U128, reserve: U128,
              committed: U128, queued: U128, fees: U128 }
struct QueueEntry { investor: AccountId, amount: U128, requested_at: u64 }
struct Proposal { id: u64, kind: ProposalKind, by: AccountId, created_at: u64,
                  approvals: Vec<AccountId>, rejections: Vec<AccountId>, status: ProposalStatus }
enum ProposalKind { StartShipper{shipper, limit}, SetLimit{shipper, limit},
                    Unpause{shipper}, CoverFromReserve{shipment_id}, SetConfig{..},
                    Upgrade{code_hash: Base58CryptoHash} }
enum ProposalStatus { Open, Approved, Rejected, Expired }
```

Collections (`near_sdk::store`, unique prefixes): `shippers: LookupMap`,
`network: LookupSet<(shipper, driver)>`, `destinations: LookupMap<u32, Destination>`,
`shipments: LookupMap<u64, Shipment>`, ordered lists (`Index`: a count per key plus one entry
per position) for drivers and destinations per shipper and shipments per shipper, driver and
destination, `investors: LookupMap<AccountId, U128 shares>`,
`queue: LookupMap<u64, QueueEntry>` with `queue_head` and `queue_tail`,
`investor_queued: LookupMap<AccountId, U128>`, `proposals: IterableMap<u64, Proposal>`.

`cash` holds everything the contract keeps for the pool. Parts of it are already spoken for:
`committed` (advances for approved shipments), `queued` (owed to queued withdrawals) and
`fees` (Waybil's 0.5%, waiting for `claim_fees`). The reserve is kept apart.

- Pool value (what shares are worth) = `cash + lent − queued − fees`.
- Free cash (for new advances and new withdrawals) = `cash − committed − queued − fees`.
- The queue is paid from `cash − committed − fees`, oldest first.

## Methods by role

### Shipper (wallet)

| Method | Rules | Event |
|---|---|---|
| `add_driver(driver)` | Shipper is active | `driver_added` |
| `add_destination(warehouse) -> u32` | Warehouse account exists | `destination_added` |
| `create_shipment(driver, destination, qty, unit, bill, due_at) -> u64` | Active, not paused, `late_bills == 0`, driver and destination in network, `due_at ≤ now + max_due_days`, `owed + committed + bill ≤ limit`, `bill ≤ max_share_bps` of pool value, free cash ≥ advance. Commits the advance. | `shipment_created` |
| `cancel_shipment(id)` | Status `Approved` only. Frees the commitment. | `shipment_cancelled` |
| `settle_report(id, driver_amount)` | Status `Reported`, `driver_amount ≤ advance`. New bill = `driver_amount × 10,000 / driver_bps` (rounded up). Pays the driver. | `report_settled`, `driver_paid` |
| repay | `ft_transfer_call` from the shipper with msg `{"repay": id}` and amount = bill. Status `Paid` (driver paid early), then `Repaid`. Late payment clears `late_bills`. | `bill_repaid` |

### Driver (Google, relayed)

| Method | Rules | Event |
|---|---|---|
| `confirm_pickup(id)` | Caller is the driver, status `Approved` | `pickup_confirmed` |

### Warehouse (Google, relayed)

| Method | Rules | Event |
|---|---|---|
| `confirm_delivery(id, good_qty, report_hash: Option<String>)` | Caller is the destination's warehouse, status `PickedUp`. If `good_qty == qty` and no report: pays the advance to the driver at once. Otherwise status `Reported` and the advance stays committed. | `delivery_confirmed`, then `driver_paid` or `problem_reported` |

### Investor (wallet)

| Method | Rules | Event |
|---|---|---|
| deposit | `ft_transfer_call` with msg `"deposit"`. Mints shares at the current share price. | `deposited` |
| `withdraw(amount)` | Pays older queued requests first. Burns shares for `amount` at the current price (rounded up). Pays the free part now and queues the rest. | `withdraw_paid`, `withdraw_queued` |
| `process_queue()` | Anyone. Pays up to 10 queued requests from free cash. | `withdraw_paid` |

The queue is also paid, oldest first, inside every repayment and reserve cover. A failed
withdrawal transfer goes back to the end of the queue (`withdraw_failed`).

### Treasury

| Method | Rules | Event |
|---|---|---|
| `claim_fees()` | Caller is `treasury`. Sends all collected Waybil fees. On failure they stay claimable. | `fees_claimed` |

### Credit assistant (`assistant` key, backend)

| Method | Rules | Event |
|---|---|---|
| `assistant_set_limit(shipper, limit)` | Shipper active, `now ≥ blocked_until`, `limit ≤ max_limit`, raise within `assistant_raise_bps` over 7 days. Lowering is always allowed. | `limit_changed` |
| `assistant_propose(shipper, limit)` | For a limit outside the caps. Creates a `SetLimit` proposal with no votes. Not allowed during the cooldown. | `proposal_created` |

### Team (3 member accounts, wallet)

| Method | Rules | Event |
|---|---|---|
| `propose(kind) -> u64` | Caller is a member. Counts as that member's approval. | `proposal_created`, `vote_cast` |
| `vote(id, approve: bool)` | Member, status `Open`, not voted yet, not expired. 2 approvals execute. 2 rejections close it and, for a limit change suggested by the assistant, set `blocked_until = now + reject_cooldown_days`. | `vote_cast`, `proposal_resolved` |
| `pause_shipper(shipper, reason)` | Any one member, takes effect at once | `shipper_paused` |
| Unpause, start shipper, set limit, cover from reserve, config | Only through an approved proposal | `shipper_unpaused`, `limit_changed`, `reserve_cover` |

`CoverFromReserve` is allowed only when the bill is unpaid `reserve_cover_after_days`
after `due_at`. The reserve pays back the advance as far as it can; anything left is a loss
shared by the pool. The bill leaves `owed`, the shipment becomes `CoveredByReserve`, and the
shipper is paused because it still owes the money off-chain.

### Anyone

`mark_late(id) -> bool` sets `late_bills += 1` on the shipper once `now > due_at` and the
bill is unpaid (status `Paid`). The backend calls it after the due date. Returns false and
changes nothing when it is not late yet or already marked. Event `bill_late`.

## Payout and callbacks

1. Update state first (status `Paid`, `lent += advance`, `cash −= advance`, release commitment).
2. `ft_transfer(driver, advance)` with 1 yoctoNEAR, then `.then(on_payout(id))`.
3. `#[private] on_payout` checks the result. On failure it puts the state back to
   `PickedUp` or `Reported` and emits `payout_failed`. It never panics.

Withdrawals and Waybil's fee transfers use the same pattern.

## Repayment split (bill 300.00)

`lent −= advance (292.50)`, `cash += 292.50 + 4.80 + 1.50`, `fees += 1.50` (Waybil,
claimed later by the treasury), `reserve += 1.20`. Rounding leftovers go to the reserve.
After a settled report the same split runs on the new bill.

## Views

`get_config`, `get_team`, `is_member(account_id)`, `get_pool`, `get_shipper(account_id)`,
`get_network(account_id)` (drivers and destinations), `get_destination(id)`,
`get_shipment(id)`, `list_shipments_by_shipper(account_id, from, limit)`,
`list_shipments_by_driver(account_id, from, limit)`,
`list_shipments_by_destination(destination, from, limit)`, `get_investor(account_id)`
(shares, value; queued amount comes with withdrawals), `get_withdraw_queue(from, limit)`
(with withdrawals), `get_proposal(id)`, `list_proposals(status, limit)` (newest first).
Lists return at most 50 items.

## Upgrades

The contract stores a `version` field (now `1`). An upgrade that changes the state adds
a `migrate()` that reads the previous struct with `env::state_read`, builds the new one and
bumps `version`.

| Stage | Who can upgrade | How |
|---|---|---|
| Development | The deployer key on `app.waybil.testnet` | `cargo near deploy` with `migrate` as the init call |
| Before the demo | Only 2 of 3 team members | See below. Then the deployer's full-access key is deleted from the contract account. |

Team upgrade flow:
1. A member calls `stage_code()` with the new wasm as raw input. Allowed only for members.
   The contract stores it and emits `code_staged` with its sha256.
2. A member calls `propose(Upgrade{code_hash})`. Members check the hash against a build
   from the tagged commit (`cargo near build` is reproducible).
3. On the second approval the contract deploys the staged code to itself and calls
   `migrate()` in the same batch. `#[private] #[init(ignore_state)] fn migrate()` reads the
   old version and writes the new one. If migrate fails the whole batch rolls back.

Event: `contract_upgraded` with the old and new hash.

## Storage

The contract account pays for storage. It holds enough NEAR on testnet for the demo.
A shipment is about 400 bytes.

## Tests

- Unit tests per method for every `E_` rule.
- Sandbox tests for the full flow: deposit → create → pickup → confirm → payout → repay,
  the report path with all three settle options, cancel, pause, a failed payout callback,
  votes (approve, reject with cooldown, expire), the withdrawal queue, and a team upgrade
  from V1 to a test V2 that keeps every shipment and balance.
