# Waybil frontend

Run from the repository root with pnpm.

```powershell
pnpm install
pnpm --filter @waybil/fe dev
```

`pnpm install` is only needed on first setup or after dependencies change.
From the root, `pnpm run dev` runs all workspace apps, including the landing page on port 3000.
The filtered command above runs only the frontend on port 3001.

Open http://localhost:3001 for the sign-in preview. The root redirects to `/start`.
Role dashboards are `/shipper`, `/driver`, `/warehouse`, `/pool` and `/admin`.
Use `/join/demo-driver` and `/join/demo-warehouse` to review invitations.
These screens use labeled demo fixtures. Real authentication, backend integration and wallet
signing are pending. No money moves. Drivers and warehouses never receive wallet prompts.

For a production gallery review in PowerShell:

```powershell
$env:NEXT_PUBLIC_GALLERY='on'
pnpm --filter @waybil/fe build
pnpm --filter @waybil/fe exec next start --port 3002
```

Open http://localhost:3002/dev/gallery. Links open every role, onboarding and system state at the
full browser width. Review at 1440, 834 and 390 pixels. Keep the flag unset for deployment.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm format:check` before submitting changes.
The role READMEs describe the fixtures, local demo flow and backend integration boundaries.
