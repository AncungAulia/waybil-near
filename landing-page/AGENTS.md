# Landing page rules (`landing-page/`)

Owner: Ancung. These rules add to the root `AGENTS.md`; they don't replace it.

## Read first

1. Root `AGENTS.md` (UI copy rules, branching, commits).
2. `docs/decisions/0006-separate-landing-page.md`: why this is its own app.
3. `docs/STRUCTURE.md`, section "Landing page": where every file goes.
4. The design in `design/waybil.pen`, section "8 · Landing page": desktop 1440, tablet 768,
   mobile 390, the open mobile menu, the scrolled navbar and the hover state of the four cards.
5. The "Motion" section of `fe/AGENTS.md`. The same rules apply here.

## Stack

Next.js (App Router) in `src/`, TypeScript, Tailwind CSS 4, Lenis for smooth wheel scrolling,
Phosphor icons. No shadcn/ui, no wallet libraries, no backend calls. Fonts come from
`next/font` (Instrument Sans).

## Rules

- Colors and fonts come from the `ds-*` tokens in `src/app/globals.css`. No raw hex in components.
- **Sizes are design pixels.** `--u` in `globals.css` is one pixel of the design: 1px on mobile
  (drawn at 390), the width over 768 on tablet, and on desktop the tighter of width over 1440 and
  height over 900 (never under 0.68). The Tailwind spacing scale is `--u`, so write the design's
  numbers: `p-24`, `gap-16`, `h-560`, `size-40`, `max-w-1360`. Font sizes use `fs-*` and corner
  radius `r-*` (`fs-72`, `r-24`). The hero uses `--uh` (1440 × 980) so it always fits the first
  screen. This keeps the layout the same on laptops with 125% or 150% display scaling.
  Never write raw `px` values or Tailwind's default `text-*`, `rounded-*` sizes in sections.
- One file per section in `src/sections`, in the order of the design.
- Photos live in `public/images` (copied from `design/landing`, max 2400 px). Use `next/image`.
- Links into the app use `APP_URL` from `src/lib/env.ts`, never a hard-coded domain.
- The navbar is a full-width bar. At the very top of the page (scroll under 24 px) it is
  transparent with white text. Scrolling down past 120 px hides it, and scrolling up brings it
  back as a white frosted bar with a thin bottom line.
- The four people cards widen on hover and keyboard focus on desktop. On tablet and mobile
  every card shows its description.
- Hover effects only for real pointers: the `hover-fine` and `desk` variants in `globals.css`.

## Moments

The motion rules in `fe/AGENTS.md` apply. These are the landing page's moments. Ask before
adding motion to anything else. Everything uses CSS transitions and `<Reveal>`, no
animation library.

| Moment                       | How often                    | Motion                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page load                    | Once per visit               | The photo fades in and settles from 1.04 first (1.5 s). Within about 0.7 s the navbar drops in, then the pill, the headline lines rise from their mask (`<Lines load>`, 1.1 s, 110 ms apart), and text and buttons fade up. No intro screen. |
| A section scrolls into view  | Once per element             | Headline lines rise from their mask (`.rise-in`, 1 s, 110 ms apart). Text fades up 8 px (`.reveal`, 0.8 s). Photos and cards open from the top down (`.media-in`, 0.85 s, 70 ms apart) while the photo settles from 1.08.                    |
| Hero photo                   | Always, while on the hero    | The photo pushes in slowly toward the truck and back (`.hero-drift`, 26 s each way, up to 1.07) while a soft band of mist drifts across the horizon (`.hero-mist`, 80 s). Both stop under reduced motion.                                    |
| Smooth scrolling             | Every wheel scroll           | Lenis, desktop wheel only. Touch keeps the native scroll. Off under reduced motion.                                                                                                                                                          |
| Section links                | Often                        | Smooth scroll to the section with no `#` in the address. A page opened with a hash jumps there and drops it.                                                                                                                                 |
| Navbar tint                  | Often                        | Progressive blur, tint crossfades with the section below (200 ms).                                                                                                                                                                           |
| Button hover                 | Often (mouse)                | The round arrow leaves up and right and a new one comes in from the bottom left (550 ms). Text links grow an underline from the left (450 ms).                                                                                               |
| A four people card widens    | Often (desktop)              | Width `ease-in-out` 300 ms, description crossfade 200 ms.                                                                                                                                                                                    |
| A FAQ answer opens or closes | Often                        | Height `ease-in-out` 200 ms, the plus folds into a minus.                                                                                                                                                                                    |
| Mobile menu                  | Often                        | Fade and 8 px drop, 300 ms on the drawer curve. Closes in 200 ms.                                                                                                                                                                            |
| Scrollbar                    | Every scroll (mouse devices) | Thin custom bar (`ScrollIndicator`) fades in while scrolling or near the right edge, fades out 0.9 s after it stops. Draggable.                                                                                                              |
| Press                        | Very often                   | Scale 0.97, release faster than press (`.press`).                                                                                                                                                                                            |

The landing page runs slower than the app on purpose: each entrance is seen once per visit.

Not used on purpose: counting numbers, parallax, looping or floating motion, reveals that
replay on every scroll. Under reduced motion, fades stay and movement goes.

## Commands

| Command                                        | What it does                                   |
| ---------------------------------------------- | ---------------------------------------------- |
| `pnpm --filter @waybil/landing-page dev`       | Runs the landing page at http://localhost:3000 |
| `pnpm --filter @waybil/landing-page build`     | Production build                               |
| `pnpm --filter @waybil/landing-page typecheck` | `tsc --noEmit`                                 |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
