# Admin screens

Issue #31. The 23 M1–M3 states live in `components/AdminScreen.tsx` with shared-type Proposal
and Pool fixtures in `data/fixtures.ts`. Routes are `/admin`, `/admin/shippers`,
`/admin/shippers/[account]` and `/admin/pool`.

The logged-in person in the design is Risk lead. The first Northwind proposal already has
Operations' approval. Approving it reaches two votes; rejecting it produces a split vote.
Further votes by the same person are disabled. Rejected and expired gallery fixtures are closed.
A new company's first limit remains pending after one person's approval. Edited limits are
preserved in the resulting local request. Rejections require a reason and remove only the
chosen application. Limits above 10,000 USDC are blocked. Pausing starts at once in the demo.

These transitions stay in component memory. Navigating away resets them. No signature,
team vote, credit change, email, pause or private document access is submitted.
Real authentication and role enforcement remain pending; these are public labeled demo routes.
Private document entries explain that the backend has not supplied a file rather than exposing
an invented document. Northwind has the full drawn detail example; the other active companies
show only the summary data supplied by the fixtures.

M2.6 and M2.9 have separate tablet and mobile drawings. Desktop keeps both company lists visible.
No dependencies were added. Screenshots and validation are in `fe/review/investor-admin/`.
