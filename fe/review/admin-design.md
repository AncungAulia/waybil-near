# Admin design alignment

Reference: the Admin M1, M2 and M3 boards in `design/waybil.pen`, including M1.1
desktop node `ewiQJ`. All 67 drawn frames were inspected. M2.6 and M2.9 have no
desktop frame, so desktop keeps both company lists as documented by the module.

The 23 states were checked at 1440, 834 and 390 pixels, producing 69 captures.
Contact sheets and representative screenshots are in [admin/](admin/), alongside
the viewport validation and interactive flow results.
Dialog screenshots freeze their entrance animations at the final frame.

## Changes

- M1 matches proposal headers, private-check badges, reason cards, stacked signers,
  terminal-state feedback, team profiles, approval history and the empty screen.
  Signed, rejected and expired proposals preserve their vote restrictions.
- M2 matches application cards, mobile tabs, document rows, company facts, shipping
  metrics, private-check results, credit and payment tiles, bill status rows, limit
  history, contact details and management controls.
- The approval, rejection, limit and pause dialogs use the drawn choice cards,
  reason pills, notes, explanatory panels and responsive sheet layout.
- M3 matches the pool stat cards, icons, dotted decoration, investor dates and shares,
  signed activity amounts, pool limits and empty, overdue and heavily lent states.

## Product rules retained

Money retains two decimals outside M3. At the user's request, M3 hides the .00
suffix on whole amounts and retains nonzero fractions. USDC stays at the same font
size, including where the board draws a smaller unit. Small screens may wrap these longer values.
The advance rate is 97.5% from PRODUCT.md rather than the board's older 98% value.
The overdue alert describes team use of the reserve after 14 days past the due date;
it does not claim an automatic payout or a reminder email was sent.
Private document buttons remain explicit sample entries. Proof links lead to the demo
account without inventing transaction hashes. No real votes, messages or transactions
are submitted.

## Verification

- Workspace lint, typecheck, 23 tests, formatting and frontend production build.
- All 69 viewport checks passed without horizontal overflow or broken images.
- Browser checks cover approval thresholds, duplicate-vote restrictions, split votes,
  the 10,000 USDC cap, edited starting limits, application rejection, limit requests,
  pausing, mobile tabs and Escape dismissal.

No dependencies were added. This implementation and its review artifacts are
AI-generated and must retain that disclosure in a future PR.

## M2 follow-up

M2.2 removes the disabled action row from Meridian's pending approval card and
uses the drawn hourglass badge, facts and mobile tabs. M2.4 displays the editable
starting limit as 2,000 with a white field and grouped decimal input. M2.5 uses
the pink rejection panel, red radio, two rows of white reason pills and a white
note field. The three pages were captured again at 1440, 834 and 390 pixels with
no horizontal overflow or broken images. The individual M2.2, M2.4 and M2.5
screenshots supersede their earlier contact-sheet thumbnails.

M2.7 open-bill statuses now use the drawn rounded pills with green Delivered,
yellow On the road and neutral Waiting for pickup colors, 11 px semibold text,
2 by 8 px padding and a 4 px gap below the amount. All three viewport captures
passed overflow and image checks. The individual M2.7 screenshots supersede the
earlier contact-sheet thumbnails.

M2.7 history uses the hourglass, trending-up and flag icons with semibold
event titles and link. Manage uses neutral Pause styling and expanding actions
in a row on desktop and tablet, stacked on mobile. Its copy continues to state
that pausing is immediate, consistent with the implemented product behavior.

M2.10 now uses triangular warning icons and the eye icon in the assessment,
with the board's brown warning text. Document rows include the drawn check
indicators, 36 px file tiles and semibold names and links. Company facts and
shipping tiles use semibold values. All three viewport captures passed overflow
and image checks. The individual M2.10 captures supersede older thumbnails.

## M3 follow-up

M3.1–M3.4 now use truck and hourglass stat icons inside 26 px circles,
24 px mobile amounts, four stat columns on tablet, green zero-overdue values,
white overdue cards, and semibold investor, activity and limit rows. Stat values
wrap their equally sized USDC suffix when needed to preserve the project money
format without clipping. APY uses the trending-up icon and is hidden for M3.2.
The empty investor and activity states use yellow circles and the drawn spacing.
M3.3 uses the pink report banner and triangle icon, while M3.4 uses an amber
hourglass banner and amber utilization text.

The 12 M3 captures (four states at three widths) passed checks for horizontal
overflow, broken images, clipped stat values, empty-state visibility, APY
visibility and alert visibility. Individual M3 screenshots supersede earlier
contact-sheet thumbnails. Workspace lint, frontend typecheck, all 17 frontend
tests, formatting and production build passed. Product exceptions above remain.
