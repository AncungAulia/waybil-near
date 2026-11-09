# Waybil · Code structure

Where code goes and how files are named. The system design lives in `docs/ARCHITECTURE.md`.
When you add a folder that isn't listed here, add it here in the same PR.

## Root

```
.
├─ contracts/            Rust contracts (Cargo, not part of the pnpm workspace)
├─ fe/                   Next.js app
├─ be/                   Express API
├─ landing-page/         Public landing page (Next.js, its own Vercel project)
├─ packages/shared/      Types and helpers used by fe and be
├─ scripts/              Testnet deploy and seed
├─ design/               Pencil file, logo, shaders
├─ docs/
├─ package.json          Root scripts only (dev, build, lint, test)
├─ pnpm-workspace.yaml   fe, be, landing-page, packages/*, scripts
├─ .editorconfig  .prettierrc.json  .gitattributes  .gitignore
```

## Frontend · `fe/`

```
fe/
├─ review/              State checklists and PR screenshots
├─ public/
│  ├─ brand/             logo, favicon, app icon (from design/logo)
│  └─ illustrations/     role and empty-state art
├─ src/
│  ├─ app/                                Routes only. Pages stay thin and render a module screen.
│  │  ├─ page.tsx                         Root route, sends people to sign in (the landing page is in landing-page/)
│  │  ├─ start/                           Sign in (A1–A5)
│  │  ├─ onboarding/{shipper,driver,investor}/   (B, C, D, E)
│  │  ├─ join/[code]/                     Invite links (F)
│  │  ├─ shipper/                         Home (P1)
│  │  │  ├─ shipments/  shipments/new/  shipments/[id]/   (P6, P2, P3)
│  │  │  ├─ network/                      (P5)
│  │  │  └─ credit/                       (P7)
│  │  ├─ driver/                          Trips (K1)
│  │  │  ├─ trips/[id]/  payouts/  companies/            (K2, K3)
│  │  ├─ warehouse/                       Arrivals (W1)
│  │  │  ├─ scan/  history/                               (W2, W3)
│  │  ├─ pool/                            Investor (I1)
│  │  │  ├─ deliveries/  deliveries/[id]/  history/       (I3)
│  │  ├─ admin/                           Approvals (M1)
│  │  │  ├─ shippers/  shippers/[account]/  pool/         (M2, M3)
│  │  ├─ not-found.tsx  error.tsx  offline/               (X1–X5)
│  │  ├─ dev/gallery/                     Every component state on one page (development only)
│  │  └─ layout.tsx
│  ├─ modules/                            One folder per role or feature
│  │  ├─ shipper/  driver/  warehouse/  investor/  admin/  onboarding/  wallet/
│  │  │  ├─ components/                   Screen parts for this module (PascalCase.tsx)
│  │  │  ├─ hooks/                        useSomething.ts (data fetching, actions)
│  │  │  ├─ data/                         Contract calls and API calls for this module
│  │  │  └─ README.md                     Which screens (codes from the design) live here
│  ├─ components/
│  │  ├─ ui/                              Form and action pieces: Button, Input, Segmented
│  │  ├─ layout/                          Logo, Navbar, MobileHeader, BottomNav, Footer, Panel
│  │  └─ elements/                        Shared Waybil pieces: StatusPill, ProofLink, ProofTag,
│  │                                      ProofCard, FanMeter, CreditMeter, Stat, KeyValue,
│  │                                      Avatar, TimelineStep, ShipmentRow, BalanceCard,
│  │                                      TxToast, EmptyState, Money, ResultScreen, DemoMap,
│  │                                      DemoRecord, DeliveryQr, QrScanner (MapView follows live data)
│  ├─ lib/
│  │  ├─ near.ts                          RPC, contract ids, view helpers
│  │  ├─ wallet.ts                        near-connect setup and signing
│  │  ├─ relay.ts                         Device key and signed delegate actions for Google users
│  │  ├─ api.ts                           Fetch wrapper for the backend
│  │  ├─ format.ts                        Money, dates, account names
│  │  ├─ errors.ts                        Contract error codes to plain sentences
│  │  ├─ status.ts                        Contract status to the chip the design draws
│  │  ├─ demo-delivery.ts                 Local driver/warehouse demo transport, no transactions
│  │  ├─ cn.ts                            Joins class names, later Tailwind class wins
│  │  └─ env.ts                           Typed public env (NEXT_PUBLIC_* only, no secrets)
│  ├─ providers/                          AppProviders, AuthProvider, WalletProvider
│  ├─ hooks/                              Hooks used by more than one module
│  └─ styles/globals.css                  Tailwind and the ds-* tokens from the design
├─ .env.example
└─ package.json
```

Rules:
- Pages in `src/app` only read params and render a screen from `src/modules`.
- A module doesn't import from another module. Shared pieces move to `components/elements`
  or `hooks`.
- Use the design token names (`ds-brand`, `ds-ink`, `ds-canvas`) in Tailwind, never raw hex.
- UI copy follows "Writing UI copy" in `AGENTS.md`.

## Backend · `be/`

```
be/
├─ src/
│  ├─ index.ts                            Starts the server
│  ├─ app.ts                              Express app, middlewares, routes
│  ├─ routes.ts                           Wires feature services and routers
│  ├─ credit-once.ts                      Runs one durable credit-review batch
│  ├─ jobs-once.ts                        Runs scheduled work without an HTTP listener
│  ├─ config/env.ts                       Reads and checks env (zod)
│  ├─ middlewares/
│  │  ├─ auth.ts                          Session check, role check
│  │  ├─ validate.ts                      zod body and params validation
│  │  ├─ rate-limit.ts
│  │  └─ error-handler.ts                 Turns errors into { error: { code, message } }
│  ├─ modules/                            One folder per feature in docs/specs/backend-api.md
│  │  ├─ auth/  profile/  relay/  invites/  applications/
│  │  ├─ credit/  reports/  admin/  jobs/
│  │  │  ├─ <name>.routes.ts              Express router, no logic
│  │  │  ├─ <name>.schema.ts              zod schemas for requests and responses
│  │  │  ├─ <name>.service.ts             The logic
│  │  │  └─ <name>.service.test.ts        vitest
│  ├─ lib/
│  │  ├─ near.ts                          RPC, contract calls, account creation
│  │  ├─ supabase.ts                      Server client (service role)
│  │  ├─ near-sdk.ts                      Signing SDK configuration and bounded retries
│  │  ├─ session.ts                       JWT creation and verification
│  │  ├─ leases.ts                        Atomic database work claims and renewal
│  │  ├─ lease-context.ts                 Stops side effects after lease loss
│  │  ├─ recovery.ts                      Identity-bound recovery-key encryption
│  │  ├─ near-ai.ts                       NEAR AI Cloud client for the credit assistant
│  │  ├─ storage.ts                       Uploads, sha256, signed links
│  │  └─ email.ts
│  ├─ test/                               Injected test providers and migration checks
│  └─ types/                              db.ts (versioned domain store), express.d.ts
├─ supabase/migrations/                   SQL migrations, one file per change
├─ .env.example
└─ package.json
```

Rules:
- Routes call services. Services call `lib/`. Nothing in `lib/` knows about Express.
- Every request body is checked with a zod schema from `<name>.schema.ts`.
- Shared request and response types are exported from `packages/shared`.

## Landing page · `landing-page/`

The public page at the root domain. No wallet, no backend calls. Decision 0006.

```
landing-page/
├─ public/
│  ├─ images/            Photos copied from design/landing (compressed, max 2400 px)
│  └─ brand/             Logo, favicon, NEAR logo
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx      Font, metadata, Open Graph image
│  │  ├─ page.tsx        Renders the sections in order
│  │  └─ globals.css     Tailwind and the ds-* tokens (copied from fe)
│  ├─ sections/          One file per section: Hero, Statement, HowItWorks, FourPeople, Faq, Cta, Footer
│  ├─ components/        Navbar, MobileMenu, Button, PhotoCard
│  └─ lib/env.ts         NEXT_PUBLIC_APP_URL for links into the app
├─ AGENTS.md
├─ .env.example
└─ package.json
```

Rules:
- Same design tokens, font and motion rules as `fe/` (see `fe/AGENTS.md`). No shadcn/ui.
- Links into the app use `NEXT_PUBLIC_APP_URL`, never a hard-coded domain.
- UI copy follows "Writing UI copy" in `AGENTS.md`.

## Shared · `packages/shared/`

```
packages/shared/src/
├─ index.ts
├─ shipment.ts       Status, Shipment, Shipper, Destination (mirrors the contract views)
├─ api.ts            Request and response types for every endpoint
├─ money.ts          USDC base units, bps math, fee split (same numbers as the contract)
└─ codes.ts          Error codes shared by contract, backend and frontend
```

## Contracts · `contracts/`

```
contracts/
├─ waybil/
│  ├─ src/
│  │  ├─ lib.rs          Contract struct, init, config
│  │  ├─ shipper.rs      Shippers, network, destinations, pause
│  │  ├─ shipment.rs     Create, pickup, delivery, report, settle, cancel, repay
│  │  ├─ pool.rs         Deposit, withdraw, queue, repayment split
│  │  ├─ team.rs         Proposals and votes
│  │  ├─ assistant.rs    Limit changes within caps
│  │  ├─ callbacks.rs    Private callbacks for token transfers
│  │  ├─ events.rs       NEP-297 events
│  │  ├─ index.rs        Ordered lists (shipments per shipper, driver, destination)
│  │  ├─ tests.rs        Unit tests
│  │  ├─ upgrade.rs      Versioned state, stage_code, migrate
│  │  └─ views.rs
│  ├─ tests/             Sandbox tests per flow
│  └─ abi/waybil.json    Generated ABI (methods, args, types) for fe and be
└─ mock-usdc/            NEP-141 test token (ABI in abi/mock-usdc.json)
```

Both crates are created with `cargo near new` and follow `docs/specs/contract.md`.

## Scripts · `scripts/`

A pnpm workspace package (`@waybil/scripts`) run with `tsx`:

```
scripts/
├─ deploy.ts         Creates the testnet accounts and deploys app.waybil.testnet (safe to rerun)
├─ seed.ts           The story in docs/specs/demo-data.md (issue #13)
├─ abi.ts            Builds each contract's ABI into contracts/<name>/abi/
└─ lib/near.ts       Calls near-cli-rs, which reads keys from the OS keychain
```

## Naming

| Thing | Style | Example |
|---|---|---|
| React component file | PascalCase | `StatusPill.tsx` |
| Hook | camelCase with `use` | `useShipment.ts` |
| Other TS files | kebab-case | `send-contract.ts`, `trips.service.ts` |
| Routes and folders | kebab-case | `shipments/new` |
| Rust files | snake_case | `shipment.rs` |
| Env vars | UPPER_SNAKE | `WAYBIL_CONTRACT` |
| Tests | next to the file | `trips.service.test.ts` |
