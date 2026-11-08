# Sign-in and onboarding screens

Issue #26. The 48 A–G and X states have fixtures in `data/fixtures.ts`.
The D6 row is labeled D5 inside its screen frames; the gallery uses the row code D6.
Routes are `/start`, `/onboarding`, `/onboarding/shipper`, `/onboarding/driver`,
`/onboarding/investor`, `/join/[code]` and `/offline`. The root now opens `/start`.
The app's not-found and error boundaries render X1 and X2.

This is a labeled local preview, with no real Google sign-in, wallet connection, account creation,
application, invitation acceptance, upload, relayer request or session token.
Buttons let reviewers follow the drawn forms without pretending to authenticate a user.
Driver and warehouse flows never show a wallet prompt. The driver saving fixture ignores the
old board note about wallet approval, following `fe/AGENTS.md` and the backend specification.

Company fields validate while typing. Changing a country clears its province and city;
changing a province clears its city. The search pickers contain sample locations, not a full
geographic dataset. Phone validation follows the selected country code. The truck plate uses
the format shown in the design. Risk acknowledgement is required before investor setup completes.
Do not interpret the pool's 1.6% fee share as a guaranteed return for an individual investor.

Two document entries are required and the tax ID is optional. Only PDF, JPG and PNG files up to
2 MB are accepted. File contents are never read, uploaded or written to local storage.
Use sample files for this preview. The ready fixture uses a 1.4 MB bank statement because the
drawn 3.4 MB example conflicts with the 2 MB limit.
Form values stay in component memory, so refreshing resets them.

Use `/join/demo-driver` and `/join/demo-warehouse` for the two invite flows.
Unknown codes render the drawn expired-or-used state. No code is claimed or consumed.
The local `/c/sam` sharing route opens the network preview; real driver-link registration
is pending. Share links use the current origin so local review does not depend on an undeployed domain.

Shared G1–G5 and X6–X7 wallet previews live in `components/elements/DemoWallet.tsx`, used by
the account buttons in `RoleShell`. The sample faucet has a local one-hour cooldown and makes
no real balance change. The offline route responds to reconnecting, but full offline navigation
and authentication recovery require backend and caching work.
X5 avoids the board's 30-day claim because the backend spec currently defines a 7-day session.

No dependencies were added. Screenshots and validation are in `fe/review/onboarding/`.
