# Demo data

One story used by every screen in `design/waybil.pen` and by the testnet seed script.
The setting is neutral and international: made-up companies, people and cities, so the demo
reads the same for judges anywhere. "Today" in the design is **Thursday, Nov 12, 2026**.
In the real app dates are live.

## Accounts (testnet)

The demo accounts look like real users. Shippers and investors bring their own wallet, so
theirs are plain testnet accounts. Drivers and warehouses get theirs from Google sign-in,
so theirs sit under `users.waybil.testnet`. Only the team uses Waybil's own accounts.

| Role | Name in the UI | Account | How it is made |
|---|---|---|---|
| Shipper | Northwind Freight Co. (Hannah Brooks, Finance) | `northwind-freight.testnet` | Testnet faucet, like any new wallet |
| Investor | Maya Harper | `maya-harper.testnet` | Testnet faucet |
| Driver | Sam Carter, truck NWF-204 | `sam.users.waybil.testnet` | Google sign-in flow (backend, issue #16) |
| Warehouse | Harbor Hub (Lena) | `lena.users.waybil.testnet` | Google sign-in flow |
| Admin team | Risk lead, Operations, Finance | `risk.`, `ops.`, `finance.waybil.testnet` | Deploy script (Waybil staff) |

For the video and live demo, the shipper and investor keys are imported into a browser
wallet, and two demo Google accounts are linked to Sam and Lena. The seed script signs as
these same accounts, so the data on screen matches this file.

## Places

| Place | Used for |
|---|---|
| Eastport | Northwind's home city. Pickup at Main warehouse, 21 Dock Road. |
| Harbor City | Harbor Hub, 9 Pier Street. The main delivery in the demo. |
| Riverton, Millbrook, Westfield | Other delivery cities |

## Shippers

| Company | State | Limit | Used |
|---|---|---|---|
| Northwind Freight Co., Eastport | Active since Oct 21 | 3,000 USDC | 2,400 |
| Blue Ridge Logistics | Active since Oct 3 | 1,500 USDC | 594 |
| Atlas Cargo | Active since Oct 21, first trip on the road | 1,500 USDC | 300 |
| Meridian Shipping, Port Ellis | Applicant, papers fine, suggested 2,000 | — | — |
| Coastline Freight, Northgate | Applicant, needs a closer look | — | — |

Northwind limit history: 0 → 2,500 (team, Oct 21), 2,500 → 3,000 (assistant, Nov 9),
3,000 → 5,000 suggested today and waiting for the team.

## Northwind shipments

| # | Route | Driver | Cargo | Bill | State |
|---|---|---|---|---|---|
| #1044 | Eastport → Westfield | Sam Carter | 60 boxes of oil | 210.00 | Approved, pickup today |
| #1043 | Eastport → Riverton | Jordan Lee | 80 sacks of sugar | 150.00 | In transit, due Dec 13 |
| #1041 | Eastport → Harbor City | Sam Carter | 120 crates of coffee | 300.00 | In transit, due Dec 11 |
| #1039 | Eastport → Millbrook | Sam Carter | 40 crates of eggs | 120.00 | Paid early, due Nov 14 |
| #1032 | Eastport → Riverton | Sam Carter | 100 sacks of flour | 300.00 | Repaid Nov 9 |

#1041 timeline today: approved 08:02, picked up 09:14, confirmed at Harbor Hub 15:36,
Sam Carter paid 292.50 at once. The problem-report variant: 8 crates wet, 112 good,
Northwind pays for what arrived (driver 273.00, bill 280.00).

## Pool

- 25,000 USDC from 5 investors. 3,294 lent out (Northwind 2,400, Blue Ridge 594, Atlas 300).
- Reserve 1,250. Pool earns 1.6% of each bill.
- Maya Harper: deposited 5,500 on Oct 21, withdrew 500 on Nov 1, 5,000 in the pool (20%), 9.72 earned.
- Other investors: `orbit-ventures`, `harbor-coop`, `leo`, `ana` (all `.testnet`).

## Name changes from the first draft

For the design and seed update after this file is approved.

| Before | After |
|---|---|
| PT Maju Logistik (Sari Wulandari) | Northwind Freight Co. (Hannah Brooks) |
| CV Lancar Jaya | Blue Ridge Logistics |
| PT Lintas Jawa | Atlas Cargo |
| Sinar Logistik, Surabaya | Meridian Shipping, Port Ellis |
| Andalas Freight, Medan | Coastline Freight, Northgate |
| Pak Budi Santoso, AB 1234 CD | Sam Carter, NWF-204 |
| Sri Rahayu | Jordan Lee |
| Semarang hub (Dewi) | Harbor Hub (Lena) |
| Rina | Maya Harper |
| Jogja / Yogyakarta | Eastport |
| Semarang | Harbor City |
| Solo, Klaten, Purworejo | Riverton, Millbrook, Westfield |
| Main warehouse, Jl. Magelang 21 | Main warehouse, 21 Dock Road |
| Jl. Kaligawe 9 | 9 Pier Street |
| 120 boxes of rice | 120 crates of coffee |
| budi-ventures, koperasi-maju, andi, sari | orbit-ventures, harbor-coop, leo, ana |
