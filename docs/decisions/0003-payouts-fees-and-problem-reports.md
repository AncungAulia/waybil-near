# 0003 — Payouts, fees, problem reports and shipment rules

- Status: accepted
- Date: 2026-11-08

## Context

The design review settled how money moves after a delivery, what happens when goods
arrive damaged, and a few rules around shipments and withdrawals. These change the
contract and backend, so they are recorded here.

## Decision

**Driver payout is automatic**

- When the warehouse confirms a delivery, the contract pays the driver in the same
  transaction. The driver taps nothing and approves nothing.
- Drivers and warehouses sign in with Google. Their actions go through the relayer
  (meta transactions), so they never see a wallet prompt.
- If the payout is slow, the driver sees "Taking longer". The money stays safe in the contract.

**Fee split (on a 300 USDC bill)**

| Who | Amount | Share |
|---|---|---|
| Driver, paid on arrival | 292.50 | 97.5% |
| Pool (investors share it by their part of the pool) | 4.80 | 1.6% |
| Safety reserve (covers unpaid bills) | 1.20 | 0.4% |
| Waybil | 1.50 | 0.5% |

- The shipper repays the full bill to the pool by the due date.
- Amounts round to 2 decimals. Any rounding remainder goes to the reserve.

**Problem reports**

- The warehouse can confirm with a problem (damaged, missing, wrong goods, other),
  a count of good units, a note and photos. Photos are stored by the backend and their
  hash is recorded with the report.
- While a report is open, the driver payout is held.
- The shipper decides what to pay:
  1. **Pay for what arrived:** good units ÷ units on the shipment × bill.
     Example: 112 of 120 boxes → bill 280.00, driver gets 273.00.
  2. **Pay in full:** bill stays 300.00, driver gets 292.50.
  3. **Pay a different amount:** the shipper types the driver amount and a reason.
     The bill becomes driver amount ÷ 0.975. The driver amount can't be above 292.50.
- After the choice the driver is paid at once and the bill changes to match.
- Each shipment stores cargo as a number and a free-text unit (boxes, kg, pallets).
  Goods that can't be counted use option 2 or 3.

**Shipments**

- A shipper can cancel a shipment only before pickup. Nothing was paid, so cancelling
  frees the limit. The driver gets a WhatsApp message.
- New shipments are blocked while a bill is late, or while the team has paused the shipper.

**Pausing a shipper (admin)**

- Pause is an emergency brake. One team member can pause a shipper's new shipments at once,
  with a reason. Turning it back on needs 2 of 3.
- Open trips keep going and drivers still get paid.

**Credit reviews**

- A shipper can ask for a review. The result is one of: raise within the cap (goes live),
  suggest a bigger raise (team decides, see 0002), or no change.
- "Ask for a review" is disabled while a raise waits for the team, and after "no change"
  until 3 more bills are paid.
- An admin can also propose a limit change by hand, with a reason. It needs 2 of 3.

**Investor withdrawals**

- An investor can ask for more than the free amount. The free part is paid now.
  The rest is queued and paid automatically, oldest request first, as shippers repay.

**Shipper documents**

- Business registration and a 3-month bank statement are required, tax ID is optional.
  PDF, JPG or PNG, up to 2 MB each.

**Contact between people**

- There is no in-app chat or calling. "Chat with …" opens WhatsApp (`wa.me/<number>`)
  with the number given at sign-up.

## Consequences

- Contract: `confirm_delivery` pays the driver in the same call; problem reports hold the
  payout; `settle_report(shipment, driver_amount)` recomputes the bill; cancel before pickup;
  pause (single signer) and unpause (2 of 3); withdrawal queue; fee split constants.
- Backend: relayer for drivers and warehouses, photo and document storage (2 MB limit),
  report reasons and notes, WhatsApp links, review cool-downs, notification emails.
- Frontend: screens P3.6–P3.11, K2.6–K2.13, W2.7–W2.12, I2.6, P7.2–P7.5, M2.11–M2.12, X1–X7.
