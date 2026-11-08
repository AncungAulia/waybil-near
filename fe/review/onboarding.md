# Sign-in and onboarding state checklist

Issue #26. Source `design/waybil.pen`. Every state is required at 1440, 834 and 390 pixels.
The D6 row labels its screen frames D5. Use the row code D6 for the gallery.

- [x] A1 Sign in
- [x] A2 Waiting for your wallet
- [x] A3 Connection declined
- [x] A4 Wrong network
- [x] A5 Checking your account
- [x] B1 Nothing selected
- [x] B2 Shipper selected
- [x] B3 Driver selected
- [x] B4 Investor selected
- [x] C1 Details, empty
- [x] C2 Details, ready
- [x] C3 Errors while typing
- [x] C4 Phone country picker
- [x] C5 Province search
- [x] C5.1 Documents, empty
- [x] C5.2 Documents, ready
- [x] C5.3 File too big
- [x] C6 Submitting
- [x] C7 Under review
- [x] C8 Approved
- [x] C9 Needs one more thing
- [x] D1 Details, empty
- [x] D2 Details, ready
- [x] D3 Errors while typing
- [x] D4 Phone country picker
- [x] D5 Saving
- [x] D6 All set
- [x] E1 Before you start
- [x] E2 Ready
- [x] E3 All set
- [x] F1 Driver invite, not connected
- [x] F2 Driver invite, connected
- [x] F3 Invite accepted
- [x] F4 Invite expired or used
- [x] F5 Warehouse invite
- [x] F6 Warehouse linked
- [x] G1 Wallet menu
- [x] G2 Get test USDC
- [x] G3 Waiting for wallet
- [x] G4 Added
- [x] G5 Too soon
- [x] X1 Page not found
- [x] X2 Something went wrong
- [x] X3 No access
- [x] X4 Offline
- [x] X5 Signed out
- [x] X6 Request declined
- [x] X7 Didn't go through

## Design and integration notes

- The ready document drawing says a bank statement is 3.4 MB but the limit is 2 MB. Use an accepted file below 2 MB in the ready fixture and reject 3.4 MB.
- Sign-in is a labeled local preview until wallet and Google verification can call the backend. It must not create a fake authenticated session or send unsigned relayer actions.
- Store only sample profile fields locally. Never store document contents or private identity files in local storage.
- Warehouse entry comes from an invite. Driver and warehouse flows never open a wallet.
