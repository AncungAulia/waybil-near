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

Next.js (App Router) in `src/`, TypeScript, Tailwind CSS 4. No shadcn/ui, no wallet
libraries, no backend calls. Fonts come from `next/font` (Instrument Sans).

## Rules

- Colors and fonts come from the `ds-*` tokens in `src/app/globals.css`. No raw hex in components.
- One file per section in `src/sections`, in the order of the design.
- Photos live in `public/images` (copied from `design/landing`, max 2400 px). Use `next/image`.
- Links into the app use `APP_URL` from `src/lib/env.ts`, never a hard-coded domain.
- The navbar is transparent with white text at the very top of the page (scroll under 24 px)
  and a white frosted pill everywhere else, swapped with a 200 ms crossfade.
- The four people cards widen on hover and keyboard focus on desktop. On tablet and mobile
  every card shows its description.

## Commands

| Command | What it does |
|---|---|
| `pnpm --filter @waybil/landing-page dev` | Runs the landing page at http://localhost:3000 |
| `pnpm --filter @waybil/landing-page build` | Production build |
| `pnpm --filter @waybil/landing-page typecheck` | `tsc --noEmit` |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
