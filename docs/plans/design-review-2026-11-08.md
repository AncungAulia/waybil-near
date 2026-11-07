# Whole design review · 2026-11-08

Scope: every board in `design/waybil.pen` (about 150 states × 3 sizes), the landing page,
Start here, Product map and Foundations. Reviewed with screenshots and text dumps by five
parallel read-only reviewers, then fixed in the file.

Legend: ✅ fixed · 📝 still to do

## Decisions taken

- **Driver payout is automatic.** When the warehouse confirms, 292.50 USDC goes straight to the
  driver. No button and no wallet step. K1.2 "Just got paid", K2.6 "Sending the money",
  K2.7 "Taking longer" (slow network fallback).
- **Demo "today" is Thursday Nov 12, 2026.** Every date moved +20 days. Due date Dec 11.
- **Fee split on a 300 USDC bill:** driver 292.50, pool 4.80 (1.6%, investors share it),
  safety reserve 1.20, Waybil 1.50.
- **Problem reports are settled by the shipper.** Pay for what arrived (count × fee, in the unit set on
  the shipment), pay in full, or pay a different amount with a reason. P3.8, P3.9, K2.11.
- **Pause is an emergency brake.** One team member can pause a shipper's new shipments at once.
  Turning it back on needs 2 of 3.
- **Demo companies:** PT Maju Logistik, CV Lancar Jaya, PT Lintas Jawa (active);
  Sinar Logistik and Andalas Freight (applicants).

## Fixed ✅

- One credit story for PT Maju: limit 3,000, 2,400 used, raised Nov 9 by the assistant (+20%),
  proposal 3,000 → 5,000 (+67%). P7 meter and pill at 80%.
- System states X1–X7: page not found, something went wrong, no access, offline, signed out,
  wallet request declined, request didn't go through.
- Old names removed (`0x…`, hidden "MON" nodes, "MetaMask", "Marigold", "carrier").
  Account names use `.testnet`.
- Onboarding: A4 explains main vs test network, B uses one role warning, C4/C5 field order,
  D5 saves without a wallet, F4 covers expired and used links, sentence fragments fixed.
- Shipper: P2 screen names, December 2026 calendar with day 11 selected, "in 29 days",
  1,200 → 1,170.00 at 97.5%, "600 USDC over your 3,000 USDC limit", "You paid", P7 navbar,
  P1.4 mobile explains the pause, P3.6 "Settle" and "Read report".
- Driver: payout totals (604.50 for 3 trips before #1041, 897.00 for 4 after), 97.5% amounts,
  "See record ↗", "seconds after arrival".
- Warehouse: 8-character code, W2.4 uses #1052, report counts "112 in good shape, 8 damaged",
  only "Damaged" selected, hidden "on-chain" hint removed.
- Investor: one company list, I3.2 shows pool, reserve, Waybil fee and your part, "Bill 300.00".
- Admin: "Recently approved", "Going live", dates before today, PT Lintas Jawa replaces Andalas
  in the active list, M2.11 Change limit and M2.12 Pause dialogs.
- Landing, Start here, Product map and Foundations copy (see the review notes in git history).

## Second pass ✅

- Contact between people goes through WhatsApp (`wa.me` link). No in-app chat or calls.
  "Call driver" is now "Chat with Pak Budi". "Message" buttons removed from problem screens.
- "Settle" renamed "Choose what to pay". P3.10 adds the "Pay a different amount" state
  (shipper's bill = driver amount ÷ 97.5%, capped at 292.50 for the driver).
- Shipments for PT Maju locked: #1044 Purworejo (approved), #1043 Solo (in transit),
  #1041 Semarang (in transit), #1039 Klaten (paid early), #1032 Solo (repaid). P6 sorted newest first,
  "On the road 2". The late bill in P1.4 is #1036. ShipmentList component and "Paid early" status fixed.
- M1 second card is "Start Sinar Logistik" (0 → 2,000). M2.1 Andalas says "Needs a closer look".
- I1.2 no longer shows a deposit. M3.4 shows a small pool (6,400, 3 investors, 6,000 lent out).
- Layout: Pool pages grow with content, P2.4 tablet calendar visible, P6.3 text wraps,
  W2.9 confirm looks disabled, P1.2 map, P1.3 near-limit card on top, K1.1 and W3.1 nav no longer covers content.
- Admin links: "Open team wallet ↗", "See CV Lancar Jaya", documents "Open ↗".
- New states: C5.3 file too big, K2.12 problem on the road, K2.13 no signal,
  W2.11 camera blocked, W2.12 already confirmed, I3.4 no deliveries yet.

## Third pass ✅

- P7.4 limit stays the same, P7.5 team said no. P7.3 disables "Ask for a review" while the team decides.
- "Cancel shipment" link in P3.1 (before pickup only) and P3.11 confirm dialog.
- I2.6 asks for the full 5,000. 2,000 comes now and 3,000 arrives by itself as bills are paid.
- P1 desktop and tablet map cards fill their frame. ShipmentList rows show the right status.
- W1.2 truck markers, labels and zoom no longer cover each other.
- I3.3 history in date order (deposit Oct 21, withdrawal Nov 1, earnings Nov 7 and 9).

## Still to do 📝

Nothing from this review. Known limits for the hackathon stay under "Out of scope".

### Out of scope for the hackathon
- Cash out to a bank in Rupiah (roadmap, NEAR Intents).
- Partial loads at pickup. Loading skeletons on every page (P6.4 shows the pattern).
