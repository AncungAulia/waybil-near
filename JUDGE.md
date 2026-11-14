# Waybil: guide for judges

A 3-minute read covers what Waybil does and where the proof is. Trying it needs a NEAR testnet
wallet for the investor and shipper, and a Google account for the driver and warehouse. Nothing
to install.

- **Web app:** https://app.waybil.xyz/start
- **Demo video (2:19):** https://x.com/waybilxyz/status/2121492124453789792
- **Landing page:** https://www.waybil.xyz
- **API health:** https://api.waybil.xyz/health
- **Full README:** [README.md](README.md)
- **Tracks entered:** Real-World Money (`realworld`) and Privacy & Private AI (`privacy`) as
  main tracks, DeFi (`defi`) as secondary

> Waybil is a hackathon prototype. Everything runs on NEAR **testnet** with test USDC. Nothing
> moves real money.

## Waybil in one minute

A truck owner delivers today and gets paid 30 to 60 days later, while fuel, tolls and wages are
due this week.

Waybil pays the driver **the moment the warehouse confirms the goods arrived**. A lending pool on
NEAR covers the bill until the shipping company pays it back.

1. **Three confirmations make a bill real.** The shipper approves the trip, the driver confirms
   pickup, and the destination's warehouse confirms arrival. Each is recorded on NEAR, and the
   same call that confirms a clean delivery pays the driver 97.5%.
2. **Credit from a private check.** A shipping company applies with its registration and bank
   statements. A credit assistant reads them on NEAR AI Cloud in a TEE, and the server, not the
   model, suggests a starting limit. Two of three team members approve it on chain.
3. **No wallet for drivers and warehouses.** They sign in with Google and a relayer pays their
   gas.
4. **Nobody can change the code alone, and anyone can check it.** `app.waybil.testnet` has no access keys. Code changes
   and big limit changes need two of three team members. Both contracts are source verified on
   NearBlocks (SourceScan), so the code on chain is the code in this repo.

## Things to try on the live site

Use a separate browser profile for each role, because each account has one role.

| Role | How to sign in | What to do | What you should see |
|---|---|---|---|
| Investor | Your own testnet wallet (Meteor is tested end to end) | **I fund deliveries**, then account menu, **Get test USDC**, then **Deposit** 100 | "Deposit received" with "See the record on NearBlocks ↗", and your money in the pool |
| Shipper | The judges' shipper below | Open [app.waybil.xyz/shipper](https://app.waybil.xyz/shipper) | The dashboard with a 500.00 USDC limit |
| Driver and warehouse | Google, from the invite links the shipper makes in **Network** | Accept the invite | "You're connected" and "You're all set", with no wallet |
| The delivery | All three | Shipper creates a shipment, driver confirms pickup, warehouse types the arrival code and confirms | The driver's screen shows "You got paid", with a NearBlocks link |

**The judges' shipper.** A new shipper needs two team members to approve it, so we approved one
for you: `judge-shipper.waybil.testnet`, a 500 USDC limit and 1,000 test USDC. Its key is in the
README under [Try it in 5 minutes](README.md#try-it-in-5-minutes). Import it in Meteor
(**Import account**, then **Private key**), choose **I ship goods** at
[app.waybil.xyz/start](https://app.waybil.xyz/start), then go to
[app.waybil.xyz/shipper](https://app.waybil.xyz/shipper). It is a shipper only, not a team key,
so it can't approve anything or touch the contract. Every judge shares it, so please don't change
its keys, pay the bills you create, and keep them small. If it stops working, DM
[@waybilxyz](https://x.com/waybilxyz): we keep approved backup shippers and swap the key.

**The credit assistant from scratch.** Apply as a new shipper with the
[Harborline Freight sample papers](docs/samples) and the values in the
[README walkthrough](README.md#2-shipper-and-the-credit-assistant), then DM
[@waybilxyz](https://x.com/waybilxyz). We approve it while judging runs. The team sees a
suggestion of 4,628.75 USDC with three green checks.

## Transactions you can open

Every link opens the public NEAR testnet explorer. Nothing here needs an account.

| What happened | Transaction |
|---|---|
| Delivery confirmed and the driver paid in the same transaction | [`5mvATcDg…`](https://testnet.nearblocks.io/txns/5mvATcDgqZKwuKQpY1f1x7FrDJ3WvLftqFJsA2eHCo2c) |
| Pickup confirmed by a driver, relayed, no gas for the driver | [`HjL4NQCh…`](https://testnet.nearblocks.io/txns/HjL4NQChSvuh5GRYvEkJRr4xcWe9ijiQeVAmLkXpKMZ4) |
| Bill repaid, split into pool, reserve and Waybil fee | [`AMWNasoD…`](https://testnet.nearblocks.io/txns/AMWNasoDyMRMm1u4fzv6bjUbQ8Rb3CJHezqp2yLV5vJc) |
| Harborline Freight's starting limit, second team vote (the one in the demo video) | [`DTNvbtC1…`](https://testnet.nearblocks.io/txns/DTNvbtC1hWoVvMu5gdkcpwixL6m2rFqA3NTUFA2DEvAR) |
| The judges' shipper approved, second team vote | [`AnZnWPtW…`](https://testnet.nearblocks.io/txns/AnZnWPtWmUbjAqawqRcokeLsiJF9RE62rpgiXkUoBfAC) |
| Latest code upgrade, approved 2 of 3 and sent with the code | [`Dqef35Re…`](https://testnet.nearblocks.io/txns/Dqef35ReGeDHF5Jz2qJV8kQikazfnxTWYdAbgyrmAQ7J) |
| The contract's last access key deleted | [`G8xd1kXG…`](https://testnet.nearblocks.io/txns/G8xd1kXGbXZpPEmZ5VbG4HdtyPVyXQ7aAYa9PgdZdiNi) |

The full list, with what each log shows, is in
[README: Receipts](README.md#receipts-check-them-yourself).

## Contracts and proofs

| What | Where |
|---|---|
| Main contract: shipments, bills, payouts, credit, the pool and team votes | [`app.waybil.testnet`](https://testnet.nearblocks.io/address/app.waybil.testnet) |
| Test USDC (NEP-141, with a faucet) | [`usdc.waybil.testnet`](https://testnet.nearblocks.io/address/usdc.waybil.testnet) |
| **Both contracts are source verified** on NearBlocks through SourceScan, from a reproducible build (NEP-330) of commit `176b27b`, code hash `DouMyHYv…` | [`app.waybil.testnet` contract tab](https://testnet.nearblocks.io/address/app.waybil.testnet?tab=contract), [`usdc.waybil.testnet` contract tab](https://testnet.nearblocks.io/address/usdc.waybil.testnet?tab=contract), [how to rebuild it yourself](README.md#receipts-check-them-yourself) |
| How each track is met, with where to check | [README: Tracks](README.md#tracks) |
| Every security layer and its limits | [README: Security model](README.md#security-model) |
| What happens if a shipper doesn't pay | [README: If a shipper doesn't pay](README.md#if-a-shipper-doesnt-pay) |
| What we know is missing, and the plan after the hackathon: mainnet, NEAR Intents, pilots | [README: Now and after the hackathon](README.md#now-and-after-the-hackathon) |

Check the code hash without a browser (public RPC, no key). It should print
`DouMyHYv6wXr4kAtmWyKyx7AMixTzYHbV2YVWcjoVoLv`:

```sh
curl -s https://rpc.testnet.fastnear.com -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"view_account","finality":"final","account_id":"app.waybil.testnet"}}' | jq -r .result.code_hash
```

## Run it locally

Needs Node 22, pnpm and, for the contracts, Rust with `cargo-near`. The commands are in
[README: Run locally](README.md#run-locally). Tests: `pnpm test` from the repo root, and
`cargo test` in `contracts/waybil/`.

## If something doesn't work

| Problem | What to do |
|---|---|
| The shipper sign-in opens the company form | That is the first sign-in of a new account. Go to [app.waybil.xyz/shipper](https://app.waybil.xyz/shipper) |
| The wallet does not open | Allow pop-ups for the site, and make sure the wallet is on **testnet** |
| "Get test USDC" is not available | The faucet gives 1,000 test USDC once a day per account. Use another account, or the judges' shipper, which already has 1,000 |
| A shipment is refused | The bill must fit the shipper's limit and the pool's free cash. Try a smaller bill |
| The truck does not move on the map at once | The demo position moves slowly along the real route after pickup. Give it a minute |
| Something looks down | https://api.waybil.xyz/health should answer `{"status":"ok"}` |

## Good to know

- Everything runs on NEAR testnet. USDC is a test token with a faucet, and pool balances are demo
  funding.
- The arrival code is checked by the backend today. Putting its hash in the contract is planned
  after the hackathon. Until then the driver and the warehouse are the shipper's own picks and
  the bill stays the shipper's debt, as the README explains under
  [Now and after the hackathon](README.md#now-and-after-the-hackathon).
- The credit assistant's papers are read by the backend before the TEE call. The TEE protects the
  inference and proves which model answered.
- More detail: [README.md](README.md).
