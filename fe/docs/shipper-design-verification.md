# Shipper design verification

Scope: align the P2–P7 shipper screens with `design/waybil.pen` and the requested visual corrections. Related issue: [#27](https://github.com/AncungAulia/waybil-near/issues/27).

## Checks

- `pnpm --filter @waybil/fe typecheck` passed.
- `pnpm exec eslint fe/src` passed.
- `pnpm --filter @waybil/fe test` passed with 17 tests across five files.
- `pnpm --filter @waybil/fe build` passed.
- Prettier checks and `git diff --check -- fe` passed for the changed frontend files.
- P2.1–P2.7 and P3.1–P3.11 rendered successfully at widths 390, 834, and 1440 px. All 54 combinations returned successful responses without page errors, development error overlays, or horizontal page overflow.
- P4.1–P4.4, P5.1–P5.4, P6.1–P6.4, and P7.1–P7.5 were inspected in the browser at the same three widths. Checks included card and dialog dimensions, content overflow, exported icons, and spinner animation.

The screens retain the existing local demo behavior. These checks do not exercise real wallet transactions or backend services.

## Manual review

Run `pnpm --filter @waybil/fe dev` and open `/dev/gallery/screens/<state>`.

1. Open P2.4 and P2.6. The ruler stays black, the marker stays yellow, and the summary text follows the limit threshold.
2. Open P3.3, P3.8, and P3.10. Check the paused location, settlement choices, and complete custom amount form. At 390 × 667 px, the custom amount dialog and its reason field fit without scrolling.
3. Open P4.1–P4.4. Check the payment dialog, rotating approval indicators, insufficient balance state, and payment result.
4. Open P5.1–P5.4. Check network status dots, empty artwork, invitation QR, and destination map controls and gate pin.
5. Open P6.1–P6.4. Check responsive shipment rows, the bills-due filter, clearing a search, and five skeleton rows.
6. Open P7.1–P7.5. Check the credit ruler, review skeletons, proposal and rejection notices, history dates, and rotating P7.4 badge.

## Screenshots

- [P2.5 — shipment form](screenshots/shipper-design/p2-5-desktop.png)
- [P3.8 — settlement choices](screenshots/shipper-design/p3-8-desktop.png)
- [P4.2 — wallet approval](screenshots/shipper-design/p4-2-desktop.png)
- [P5.4 — mobile destination form](screenshots/shipper-design/p5-4-mobile.png)
- [P6.1 — shipment list](screenshots/shipper-design/p6-1-desktop.png)
- [P7.1 — credit](screenshots/shipper-design/p7-1-desktop.png)
