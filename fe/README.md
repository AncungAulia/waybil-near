# Waybil frontend

Run from the repository root with pnpm.

```powershell
pnpm install
pnpm --filter @waybil/fe dev
```

Open http://localhost:3001/driver or http://localhost:3001/warehouse.
These screens currently use labeled demo fixtures. The backend and sign-in are pending.
No money moves, and no wallet is requested for either role.

For a production gallery review in PowerShell:

```powershell
$env:NEXT_PUBLIC_GALLERY='on'
pnpm --filter @waybil/fe build
pnpm --filter @waybil/fe exec next start --port 3002
```

Open http://localhost:3002/dev/gallery. Links open every driver and warehouse state at the
full browser width. Review at 1440, 834 and 390 pixels. Keep the flag unset for deployment.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm format:check` before submitting changes.
The role READMEs describe the fixtures, local demo flow and backend integration boundaries.
