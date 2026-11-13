# Sample papers

Three papers for trying shipper onboarding and the credit assistant. They look formal, but
everything in them is fictional. Each page has a "SAMPLE" watermark and the line "SAMPLE -
FICTIONAL DOCUMENT FOR THE WAYBIL TESTNET DEMO - NOT VALID". The issuers (Sample Business
Registry Office, Sample Tax Service Office and Bank Central) are made up too.

| File | What it is |
|---|---|
| [merapi-cargo-registration.pdf](merapi-cargo-registration.pdf) | Business registration certificate |
| [merapi-cargo-tax-id.pdf](merapi-cargo-tax-id.pdf) | Taxpayer registration certificate. Optional in the app, and the assistant does not read it. |
| [merapi-cargo-bank-statement.pdf](merapi-cargo-bank-statement.pdf) | USD business account statement, August to October 2026 |

## The company

| Field | Value |
|---|---|
| Company name | Merapi Cargo |
| Registration number (NIB) | 9120 3048 5571 2 |
| Tax ID (NPWP) | 01.234.567.8-541.000 |
| Address | Jl. Kaliurang Km 7 No. 21, Sinduharjo, Ngaglik, Sleman, Daerah Istimewa Yogyakarta 55581 |

Enter these in the application form so they match the papers. **Company name** is
`Merapi Cargo` and **Business registration number** is `9120304855712` (13 digits, no spaces).

## What the credit assistant should find

| Month | Total debits (money out) |
|---|---|
| August 2026 | 14,250.00 USD |
| September 2026 | 15,900.50 USD |
| October 2026 | 16,120.75 USD |
| Average | 15,423.75 USD |

The testnet policy suggests 20% of the average, so the team sees a suggested starting limit of
**3,084.75 USDC** with three green checks (company name, registration number, recent months).
Two team members still have to approve it.

The months must end last month or this month, so these papers pass that check until the end of
November 2026.
