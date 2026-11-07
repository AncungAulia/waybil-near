# Demo data

One story used by every screen in `design/waybil.pen` and by the testnet seed script.
"Today" in the design is **Thursday, Nov 12, 2026**. In the real app dates are live.

## Accounts (testnet)

| Role | Name in the UI | Account |
|---|---|---|
| Shipper | PT Maju Logistik (Sari Wulandari, Finance) | `shipper.waybil.testnet` |
| Driver | Pak Budi Santoso, truck AB 1234 CD | `driver.waybil.testnet` |
| Warehouse | Semarang hub (Dewi) | `warehouse.waybil.testnet` |
| Investor | Rina | `investor.waybil.testnet` |
| Admin team | Risk lead, Operations, Finance | team wallet |

## Shippers

| Company | State | Limit | Used |
|---|---|---|---|
| PT Maju Logistik, Yogyakarta | Active since Oct 21 | 3,000 USDC | 2,400 |
| CV Lancar Jaya | Active since Oct 3 | 1,500 USDC | 594 |
| PT Lintas Jawa | Active since Oct 21, first trip on the road | 1,500 USDC | 300 |
| Sinar Logistik, Surabaya | Applicant, papers fine, suggested 2,000 | — | — |
| Andalas Freight, Medan | Applicant, needs a closer look | — | — |

PT Maju limit history: 0 → 2,500 (team, Oct 21), 2,500 → 3,000 (assistant, Nov 9),
3,000 → 5,000 suggested today and waiting for the team.

## PT Maju shipments

| # | Route | Driver | Cargo | Bill | State |
|---|---|---|---|---|---|
| #1044 | Jogja → Purworejo | Pak Budi | 60 boxes of oil | 210.00 | Approved, pickup today |
| #1043 | Jogja → Solo | Sri Rahayu | 80 sacks of sugar | 150.00 | In transit, due Dec 13 |
| #1041 | Jogja → Semarang | Pak Budi | 120 boxes of rice | 300.00 | In transit, due Dec 11 |
| #1039 | Jogja → Klaten | Pak Budi | 40 crates of eggs | 120.00 | Paid early, due Nov 14 |
| #1032 | Jogja → Solo | Pak Budi | 100 sacks of flour | 300.00 | Repaid Nov 9 |

#1041 timeline today: approved 08:02, picked up 09:14, confirmed at Semarang hub 15:36,
Pak Budi paid 292.50 at once. The problem-report variant: 8 boxes wet, 112 good,
PT Maju pays for what arrived (driver 273.00, bill 280.00).

## Pool

- 25,000 USDC from 5 investors. 3,294 lent out (PT Maju 2,400, CV Lancar 594, PT Lintas 300).
- Reserve 1,250. Pool earns 1.6% of each bill.
- Rina: deposited 5,500 on Oct 21, withdrew 500 on Nov 1, 5,000 in the pool (20%), 9.72 earned.
