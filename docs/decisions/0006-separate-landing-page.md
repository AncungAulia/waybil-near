# 0006 — The landing page is its own app

- Status: accepted
- Date: 2026-11-08

## Context

The first plan put the landing page inside `fe/` as a route group. The landing page and the
app differ in nearly every way. The landing page is a public, photo-heavy marketing page
that has to load fast and be found by search engines. The app is a signed-in tool with
wallets, Google sign-in and contract calls. They also have different owners, and the landing
page should not wait on the app's release schedule.

## Decision

- The landing page lives in `landing-page/`, a separate pnpm workspace package. Ancung owns it.
- Stack: Next.js (App Router), TypeScript and Tailwind CSS, with the same design tokens,
  font and motion rules as `fe/`. No shadcn/ui, no wallet libraries and no backend calls.
- It deploys as its own Vercel project. The landing page is served at the root domain and the
  app at the `app.` subdomain (planned: `waybil.xyz` and `app.waybil.xyz`).
- Links from the landing page into the app are plain links to the app's URL, read from one
  public env value.
- The design source is `design/waybil.pen`, section "8 · Landing page". Its photos live in
  `design/landing/` and are copied into `landing-page/public/`.

## Consequences

- `fe/` no longer has a marketing route. Its root route is the sign-in entry.
- The two apps share tokens by copying them. If a token changes, both are updated in the same PR.
- CI lints and typechecks `landing-page/` like the other packages.
