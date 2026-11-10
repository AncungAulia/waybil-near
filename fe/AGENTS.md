# Frontend rules (`fe/`)

Owner: Yeypayeyy. These rules add to the root `AGENTS.md`; they don't replace it.

## Read first

1. Root `AGENTS.md` (UI copy rules, branching, commits).
2. `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`.
3. `docs/STRUCTURE.md`, section "Frontend": where every file goes.
4. The screens in `design/waybil.pen`. Each route in STRUCTURE.md names its screen codes
   (for example `shipper/shipments/new` is P2). Build every state on that board, in all
   three sizes (mobile 390, tablet 834, desktop 1440).
5. For contract calls: `docs/specs/contract.md`. For backend calls: `docs/specs/backend-api.md`.

## Stack

Next.js (App Router) in `fe/src`, TypeScript, Tailwind CSS 4, our own components in
`src/components` built to the design (no shadcn/ui), Radix Dialog for sheets and dialogs,
near-connect for wallets, MapLibre GL with OpenStreetMap tiles, browser camera for QR.
Since there is no component library, menus, comboboxes, radio groups and the date grid follow
the WAI-ARIA keyboard patterns by hand (see `WalletMenu`, `SearchPicker`, `DueGrid`). Copy
those when you build a new one.
Types and money helpers come from `@waybil/shared`. Never redo the fee math in the UI.

## Rules

- Colors, radius and fonts come from the design tokens (`ds-brand`, `ds-ink`, `ds-canvas`,
  Instrument Sans). No raw hex in components.
- Pages in `src/app` stay thin. Screens live in `src/modules/<role>`.
- Every recorded action ends with a proof link (`ProofLink`) to NearBlocks.
- Money shows two decimals with "USDC" next to the number, at the same size, as the board
  writes it. Only the amount field keeps a smaller suffix.
- Mobile: the main button sits at the bottom of the screen. Empty and error states fill the
  full width and height.
- Drivers and warehouses never see a wallet prompt. Their actions go through the relayer.
- Only `NEXT_PUBLIC_*` env values reach the browser, and they are never secrets.

## Motion

The more often people see something, the less it moves. Delight is only for rare moments.
Animate `transform` and `opacity` only (plus `clip-path` and a small `filter: blur` for swaps).
Use CSS transitions for almost everything. Use the `motion` library only for springs,
gestures and drag.

**Tokens** (in `src/styles/globals.css` under `@theme`, so they become Tailwind utilities):

```css
@theme {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* entering or responding */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* moving across the screen */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* bottom sheets and drawers */
}
```

Hover and color changes use plain `ease`. Never use `ease-in`.

**Durations:** press 100 to 160 ms, menus and tooltips 150 ms, enter 200 ms, leave 150 ms,
sheets and drawers 300 ms. UI motion stays under 300 ms. Only the rare moments below run longer.

**Rules**

- Press: scale 0.97 to 0.98 on anything tappable. Release faster than press.
- Hover only for real pointers: `@media (hover: hover) and (pointer: fine)`.
- Focus: 2 px ring with 2 px offset, keyboard only (`:focus-visible`).
- Enter: fade plus an 8 px rise. Never start from `scale(0)`. Start at 0.95 or more.
- Menus and popovers scale 0.96 to 1 from their trigger. Dialogs scale from the center.
- Button state swaps (Approve, Approving, Approved): 200 ms crossfade with a 2 px blur.
- No animation for keyboard actions or for switching tabs and menu items.
  The active tab highlight in the bottom nav and segmented tabs may slide.
- Bottom sheets (Decide, Choose what to pay, Report a problem) can be swiped down.
  A quick flick (velocity over 0.11) closes them. Dragging past the top edge rubber-bands.
- Layout changes: `ease-in-out` 200 ms with a crossfade, and no animation on first load.
- Loading: skeletons shimmer slowly and crossfade to content. Data that is already loaded
  appears at once.
- Reduced motion (`prefers-reduced-motion: reduce`): keep fades and color changes, drop
  movement and scale.
- **Money never counts up or ticks.** A new amount (balance, payout, limit used, pool size)
  crossfades. No bounce or shake.
- A changed count or badge (for example "Waiting 2") pops once from 0.9 to 1.
- Meters (the ruler on credit and pool cards) don't animate their fill. A new value crossfades.

**Moments in Waybil**

| How often | Where | Motion allowed |
|---|---|---|
| Many times a day | Trips and shipment lists, tabs, bottom nav, status pills, map pan and zoom, scan screen, filters | Press feedback and crossfades only |
| Sometimes | Opening a shipment, bottom sheets and dialogs, QR shown on arrival, "recorded" proof card, type-code screen | A short enter (200 ms), sheets 300 ms, no spring |
| Rare | Driver "You got paid" (K1.2, K2.8), warehouse "Confirmed" (W2.6), "Paid" on a bill (P4.4), a limit going live (M1.2, P7) | A small spring, about 400 ms, on the main card or stamp only |
| Once | Onboarding done (C8 Approved, D6 All set, E3 Investor ready), first shipment approved, first payout | Spring entrance (bounce 0.2), items stagger 50 ms apart |

Ask the team before adding motion to anything not listed here.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
