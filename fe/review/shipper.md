# Shipper state checklist

Issue #27. Source `design/waybil.pen`. Every state below is required at 1440, 834 and 390 pixels.

- [x] P1.1 Home
- [x] P1.2 Home, first visit
- [x] P1.3 Near the limit
- [x] P1.4 Late bill
- [x] P2.1 Empty
- [x] P2.2 Choose a driver
- [x] P2.3 Choose a destination
- [x] P2.4 Due date
- [x] P2.5 Ready to approve
- [x] P2.6 Over the limit
- [x] P2.7 Waiting for wallet
- [x] P3.1 Approved
- [x] P3.2 On the road
- [x] P3.3 Location paused
- [x] P3.4 Arrived, paid early
- [x] P3.5 Repaid
- [x] P3.6 Problem reported
- [x] P3.7 Problem report
- [x] P3.8 Settle the report
- [x] P3.10 Settle, different amount
- [x] P3.9 Settled
- [x] P3.11 Cancel shipment
- [x] P4.1 Pay
- [x] P4.2 Approving in wallet
- [x] P4.3 Not enough USDC
- [x] P4.4 Paid
- [x] P5.1 Network
- [x] P5.2 Empty network
- [x] P5.3 Invite a driver
- [x] P5.4 Add a destination
- [x] P6.1 All shipments
- [x] P6.2 Filtered: bills due
- [x] P6.3 No results
- [x] P6.4 Loading
- [x] P7.1 Credit
- [x] P7.2 Agent is reviewing
- [x] P7.3 Waiting for the team
- [x] P7.4 Limit stays the same
- [x] P7.5 Team said no

## Design and data notes

- Use Jordan Lee from demo-data.md where the map still says Sri.
- P4.2 draws two wallet approvals. NEP-141 repayments do not use ERC-20 allowances. Keep the drawn waiting state, and confirm the exact registration/signing flow with Ancung before real wallet integration. No interface changes in this batch.
- The report uses crates from demo-data.md rather than the boxes drawn in its count cards.
- Fixtures and local transitions remain labeled as demos. No transaction hashes or confirmations are fabricated.

## Desktop alignment pass (2026-11-10)

The shipper board was extracted into `design-spec.json` with the pencil MCP and every state
was compared with `compare-to-design.js` at 1440 pixels. What the report still lists is one
of these four, and none of them is an app defect:

- Text the report cannot read. A placeholder or an input's value is not a text node, so
  "e.g. 120 crates of coffee", "0.00", "300.00", "Search shipments", "Lakeside",
  "9 Pier Street, Harbor City" and "lena@harborhub.com" come back missing. All of them are
  on the screen. The same goes for the QR on P5.3, which the report skips as an image.
- The invite link. P5.3 draws `app.waybil.xyz/join/c8F2kq`. The app shows the link that
  actually opens the driver invitation, so the demo stays usable.

### Asked for on the home screen, away from the board

The map card and the credit column had to fit one screen, so P1.1 to P1.4 differ from the
board on purpose:

- The ruler's legend ("In use" and "Free") is gone from the credit card. The ruler and its
  marker stay. P7 still draws the pair.
- The credit card and the bill card sit on tighter padding and gaps, 16 and 20 instead of 24.
- The map fills what is left of the row, so it is 624 instead of the 745 it had before, and
  293 on a first visit. Both columns still end on the same line.

### For Ancung, where the board disagrees with itself

- The home list writes `#1039 · Sam · due Nov 14` while the credit card on the same screen
  and the shipments page both write "Due in 2 days" for that bill. The app follows the two.
- P2.1 and P2.2 write "You pay by Dec 11" with no date chosen, while P2.3 writes
  "You pay by the due date". The app follows P2.3 until a date is picked.
- The problem banner quotes "8 crates arrived wet, 4 torn open." while the report sheet
  behind it writes "8 crates arrived wet, 4 of them torn open." The app shows the receiver's
  real note in both places.
- P6.3 and P6.4 count 3 shipments on the road, P6.1 and P6.2 count 2, from the same five
  shipments. The app counts the data.
