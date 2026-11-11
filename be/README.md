# Waybil backend

Run from the repository root with Node.js 22+ and pnpm 12.3.4.

```sh
pnpm install
cp be/.env.example be/.env
pnpm --filter @waybil/be dev
```

`GET http://localhost:4000/health` returns `{"status":"ok"}` without external credentials.
Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` together, and a random `JWT_SECRET` of at
least 32 characters, to enable database-backed sessions. Apply the SQL files in
`be/supabase/migrations` in filename order to your Supabase project before using its routes.
The service-role key bypasses RLS and belongs only in the backend environment.

Default browser origin/app URL is `http://localhost:3001`. Set `CORS_ORIGINS` to a comma-separated
list of exact origins. JWT issuer/audience default to `waybil-api` and `waybil-app`. Sessions
last seven days. Keep `TRUST_PROXY_HOPS=0` locally; configure only the actual trusted proxy
count when deploying. Public endpoints have an IP request limit.

```sh
pnpm --filter @waybil/be test
pnpm --filter @waybil/be typecheck
pnpm --filter @waybil/be build
pnpm --filter @waybil/be start
pnpm lint
```

Tests use injected providers and an isolated PostgreSQL-compatible PGlite instance to apply
migrations, check access and test conditional updates. They do not use real keys or documents.
The production bundle includes the shared TypeScript workspace package. Provider dependencies
remain external Node packages. Feature credentials are validated before that feature is used;
missing integrations return an unavailable error rather than a simulated success.

Runtime dependencies added in #15: Express, zod, Supabase client, jose, cors and express-rate-limit.
Development dependencies include tsx, tsup, supertest and PGlite plus type packages.
This backend implementation uses AI assistance. Shared API types live in `packages/shared`;
this work does not wire frontend screens or modify contracts.

## Invitations (#18)

The invitation routes create, list, read and accept seven-day invitations. Warehouse invites
require an address. Public reads omit contact data; acceptance is conditional and returns
`networkLinkRequired` because the shipper must still sign its network change. Signup
reservations protect the invitation for five minutes without consuming it. Google identity
resolution is connected by #16; until then the production accept route fails unavailable.
This branch depends on `be/15-scaffold`. No additional dependencies were added for #18.
