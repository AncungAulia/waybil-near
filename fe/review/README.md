# Frontend review

The remaining frontend batches are organized into progressive commits on `fe/shipper` for review.
Commits and a branch push are authorized. No PR, merge or deployment is authorized.
Vercel deployment is deferred.
The foundation and driver/warehouse batches were merged in PRs #52 and #53.
Issue #32 was closed because the landing page already exists.

## Run

If dependencies are already installed, run from the repository root:

```powershell
pnpm --filter @waybil/fe dev
```

Open http://localhost:3001. The root opens `/start`.
`pnpm run dev` also works from the root and starts all workspace apps; port 3000 belongs
to the landing page. The frontend remains on port 3001.

For all fixtures, set `$env:NEXT_PUBLIC_GALLERY='on'` before starting or building the frontend.
Open `/dev/gallery` and follow the role-screen links. The gallery is off by default.
The frontend README includes production-build commands for CSS review.

## State coverage

| Batch                      | Drawn states | Checklist                               | Screenshots                                       |
| -------------------------- | -----------: | --------------------------------------- | ------------------------------------------------- |
| Shipper #27                |           39 | [Shipper](shipper.md)                   | [Contact sheet](shipper/contact-390-1.jpg)        |
| Investor #30 and Admin #31 |           37 | [Investor and admin](investor-admin.md) | [Contact sheet](investor-admin/contact-390-1.jpg) |
| Sign-in and onboarding #26 |           48 | [Onboarding](onboarding.md)             | [Contact sheet](onboarding/contact-390-1.jpg)     |

Each state is reviewed at 1440, 834 and 390 pixels. Screenshot folders contain contact sheets
at every width, representative full screenshots, and validation JSON.
The full individual capture sets are generated locally under `D:/Temp/waybil-*`.

Validation passed for the production build, workspace lint, typecheck, all 23 tests, formatting
and `git diff --check`. The final cross-tab warehouse confirmation also updated the driver
to paid without a browser error. [Route and check results](routes.json) record the final smoke check.

## Review the flows

- `/start` opens the labeled sign-in preview. Select a role, complete its setup, and reach its dashboard.
- `/join/demo-driver` opens the driver invitation. Complete the short setup, then accept the invitation.
- `/join/demo-warehouse` opens the receiver invitation and leads to the scanner.
- `/shipper/shipments/new` preserves the entered driver, cargo, bill and due date. New local IDs start at #1045.
- Open `/driver/trips/1041` and `/warehouse` in two tabs. Confirm code `7K2Q9F4M` to see the driver paid at once.
- Reset the demo, report a problem in the warehouse, then settle it on `/shipper/shipments/1041`.
  A different payout must stay below the original advance. Repaying the revised bill preserves the chosen driver payout.
- Cancel an approved new shipment to release its credit. Search and filter the shipment list.
- `/pool` supports a local deposit and withdrawal. Gallery I2.6 shows a withdrawal with 2,000.00 USDC free
  and 3,000.00 USDC queued from a 5,000.00 USDC request.
- `/admin` starts with one approval on Northwind's proposal. Approving reaches two; rejecting leaves a split vote.
  A person cannot vote twice. New-company approval stays pending until another member approves.
- `/admin/shippers` supports application decisions, reasons, a changed starting limit and a local pause.
- Account menus expose the test-USDC preview and its one-hour local cooldown. Driver and warehouse screens have no wallet menu.

To reset local demos, remove browser storage keys beginning with `waybil-demo-`.
Gallery fixtures ignore stored delivery and shipment results.

## Integration boundaries

All actions are clearly labeled local demos. Real Google and wallet authentication, device keys,
signed relayer actions, API calls, private uploads, credit decisions, notifications and transaction
receipts remain pending. No real money moves, no transaction hash is invented, and no email is sent.
Admin state resets on navigation. Historical investor activity remains fixture data.
The maps retain the design's fictional geography. Full offline navigation is pending.
These issues remain open for integration; the frontend does not claim testnet completion.

## Design follow-ups for Ancung

- Confirm the first-time NEP-141 signing/registration copy. The wallet waiting drawings show an allowance-like step.
- The ready document drawing uses a 3.4 MB bank statement despite the 2 MB limit. The ready fixture uses 1.4 MB.
- Remove the driver saving note about a wallet. Drivers and warehouses use Google and the relayer.
- Align the invite's 98% payout with the specified 97.5%, and show individual investor earnings as a share of pool earnings.
- Confirm the session lifetime. The backend spec says 7 days; X5 says 30 days. The UI currently avoids a duration claim.
- M2.6 and M2.9 intentionally have no desktop drawing; desktop shows both company lists.

Foundation questions about the footer, missing status chips and FanMeter wording remain recorded in PR #52.
No new dependencies were added in these batches. All changes remain under `fe/`.
This implementation is AI-generated and must retain that disclosure when a PR is opened.
