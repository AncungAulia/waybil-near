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
