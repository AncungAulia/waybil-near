# Onboarding verification

Local frontend verification for the A–G and X design alignment on November 10, 2026.

- Frontend production build passed, including TypeScript compilation.
- Frontend typecheck passed after correcting the company phone-code state type.
- ESLint passed across `fe/src`.
- Prettier passed for all changed TypeScript and CSS files.
- Frontend Vitest suite passed with 17 tests across 5 files.
- All 48 onboarding states rendered at 390 × 844, 834 × 1112 and 1440 × 900.
  The initial 144-page sweep found no runtime exceptions, failed local requests or broken images.
- The sweep found horizontal overflow in the C4 phone-code menu at tablet width.
  The company menu now aligns to its right edge on larger screens. C4 and D4 were
  checked again at all three sizes and fit without horizontal overflow.

## Interaction checks

- Role selection enables the corresponding continue button.
- The empty company form prevents continuation and defaults to Indonesia.
- Searching phone countries and selecting Singapore updates the dial code.
- Document submission requires registration and bank statement files.
- An oversized document shows the size error. Replacing it with a valid file enables submission.
- Submitting documents shows the waiting state.
- Investor acknowledgement is required and leads to the ready screen.
- The driver invitation completes driver setup and invitation acceptance.
- The warehouse invitation reaches the linked screen.
- Account menus open from Shipper, Investor and Admin pages.
- Opening a wallet dialog by clicking does not focus the close button.
- The sample faucet shows waiting and success, then enforces its local cooldown.
  The browser's previous faucet cooldown value was restored after checking.
- Shared dialogs I2.1, K2.3, W2.2, M1.4 and P5.3 open and close with Escape.

Representative screenshots use the `verified-` prefix in this directory.
The application still uses local authentication and transaction previews. These checks
did not connect a real wallet, sign in with Google, upload documents to a server or
submit testnet transactions.
