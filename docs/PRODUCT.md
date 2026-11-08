# Waybil · Product

This is the source of truth for **what** Waybil does. Details live in
`docs/decisions/` and the screens in `design/waybil.pen`. When a decision changes,
update this file in the same PR.

## The problem

In many countries, small truck owners pay for fuel, tolls and crew before every trip.
The shipping company pays the bill weeks later. To keep driving, truck owners borrow
at high rates or turn loads down.

## The idea

Waybil pays the driver the moment the receiving warehouse confirms the goods arrived.
The money comes from a lending pool funded by investors. The shipping company repays
the pool by the due date it agreed to before the truck left.

Three confirmations make a bill real: the shipper approves the trip, the driver confirms
pickup, the warehouse confirms arrival. Each one is recorded on NEAR, so investors lend
against proof, not promises.

## Roles

| Role | Who | Signs in with | Main jobs |
|---|---|---|---|
| **Shipper** | Company that ships goods and pays the bill | NEAR wallet | Apply, approve trips, pay bills, settle problem reports |
| **Driver** | Truck owner | Google | Confirm pickup, show QR on arrival, get paid |
| **Warehouse** | Staff at the receiving address | Google, through an invite | Scan the QR or type the code, confirm or report a problem |
| **Investor** | Anyone with test USDC | NEAR wallet | Deposit, earn, withdraw |
| **Admin** | Waybil team of three (Risk lead, Operations, Finance) | NEAR wallet | Approve new shippers and big limit changes (2 of 3), pause shippers |

The **credit assistant** is not a person. It reads shipper papers and payment history
in a private computer (NEAR AI Cloud) and suggests limits within fixed caps.

## Main flow

1. **Shipper applies.** Company details, shipping profile, business registration and a
   3-month bank statement. The credit assistant checks the papers and suggests a starting
   limit. Two team members approve it.
2. **Shipper builds a network.** Invites drivers and receiving warehouses by link.
3. **Shipper approves a shipment.** Driver, pickup, destination, cargo (number + unit),
   fee and due date. The fee and due date are locked. The bill must fit the credit limit.
4. **Driver confirms pickup** and drives. The shipper sees the truck on a map.
5. **Warehouse confirms arrival** by scanning the driver's QR or typing the 8-character code.
6. **Driver is paid at once**, 97.5% of the fee, with no tap and no wallet.
7. **Shipper repays** the full bill to the pool by the due date.
8. **Investors earn** their share of the pool's 1.6%.

When goods arrive damaged or short, the warehouse reports it with a count and photos.
The payout is held until the shipper chooses what to pay (see 0003).

## Money rules

- Fee split on a bill: driver 97.5%, pool 1.6%, safety reserve 0.4%, Waybil 0.5%.
- Credit limit per shipper: the assistant can raise it up to 20% a week and never above
  10,000 USDC. Bigger changes and every first limit need 2 of 3 team members.
- No new shipments while a bill is late or while the team has paused the shipper.
- The reserve covers a bill that is still unpaid 14 days after its due date (team decision).
- Investors can withdraw what is free now. The rest is queued and paid as bills are repaid.

Details: `docs/decisions/0002-admin-multisig-and-agent-rules.md`,
`docs/decisions/0003-payouts-fees-and-problem-reports.md`.

## Product rules for the UI

- Plain words, full sentences, no jargon. See "Writing UI copy" in `AGENTS.md`.
- Every recorded action shows a proof link to NearBlocks.
- People contact each other on WhatsApp. There is no in-app chat.

## Scope for the hackathon (deadline Nov 14, 2026)

**In:** everything above on NEAR testnet with test USDC, the landing page, the five role
apps on desktop, tablet and mobile, and the demo story in `docs/specs/demo-data.md`.

**Out:** real money and mainnet (except a small NEAR Intents demo if time allows),
cash out to a bank, partial loads at pickup, orders from outside systems,
loading skeletons on every page.

## Glossary

| Word | Meaning |
|---|---|
| Bill | What the shipper owes the pool for one shipment (the fee) |
| Advance / payout | What the driver gets on arrival (97.5% of the bill) |
| Pool | Investor money that pays drivers early |
| Reserve | Money set aside from fees to cover unpaid bills |
| Limit | The most a shipper can owe at once |
| Destination | A receiving address linked to one warehouse account |
| Report | A warehouse note that goods arrived damaged, short or wrong |
| Proposal | A change that waits for 2 of 3 team members |
