# Investor and admin state checklist

Issues #30 and #31. Source `design/waybil.pen`. Review each state at 1440, 834 and 390 pixels.
M2.6 and M2.9 have no separate desktop drawing. Desktop shows both company lists together.

- [x] I1.1 Pool
- [x] I1.2 First visit
- [x] I1.3 Pool busy
- [x] I2.1 Deposit
- [x] I2.2 Approving in wallet
- [x] I2.3 Not enough USDC
- [x] I2.4 Deposited
- [x] I2.5 Withdraw
- [x] I2.6 Withdraw, pool busy
- [x] I2.7 Withdrawn
- [x] I3.1 Deliveries
- [x] I3.2 One delivery
- [x] I3.3 History
- [x] I3.4 No deliveries yet
- [x] M1.1 Waiting for signatures
- [x] M1.2 Threshold met
- [x] M1.3 All clear
- [x] M1.4 Reject with a reason
- [x] M1.5 Split vote
- [x] M1.6 Rejected
- [x] M1.7 Expired
- [x] M2.1 Applications
- [x] M2.2 Approved, waiting for signatures
- [x] M2.3 Shipper detail
- [x] M2.4 Decide
- [x] M2.5 Decide, reject
- [x] M2.6 Active tab
- [x] M2.7 Active shipper
- [x] M2.8 Nothing waiting
- [x] M2.9 No active shippers
- [x] M2.10 Needs a closer look
- [x] M2.11 Change limit
- [x] M2.12 Pause new shipments
- [x] M3.1 Pool health
- [x] M3.2 Empty pool
- [x] M3.3 Bill overdue
- [x] M3.4 Almost all lent out

## Integration notes

- Wallet signing, backend review results and real transaction receipts remain pending.
- Deposit waiting states draw an allowance step. Confirm the actual NEP-141 registration and signing flow before integration.
- Fixtures follow demo-data.md where board amounts differ. Shared money helpers remain authoritative.
- Local demos must not claim to cast real votes, transfer money, notify a company or approve credit.
