# Waybil

Waybil pays freight carriers the moment a delivery is confirmed, financed by a
lending pool on NEAR.

> Work in progress for NEAR HACKATHON 2026.

## The problem

<!-- Who is hurt, how often, and what it costs them. -->

## How it works

<!-- Shipment flow: create → pickup → delivery confirmed → advance → repay. -->

## How to run

You need Node.js 22 or newer and pnpm 12 (`corepack enable` installs it).

1. Install everything: `pnpm install`. You see "Done" and no peer dependency warnings.
2. Check the code: `pnpm lint`, `pnpm typecheck` and `pnpm test`. Each one ends without errors.
3. Format the code: `pnpm format`.

The contracts are live on NEAR testnet:

| Contract | Account |
|---|---|
| Waybil | [`app.waybil.testnet`](https://testnet.nearblocks.io/address/app.waybil.testnet) |
| Test USDC | [`usdc.waybil.testnet`](https://testnet.nearblocks.io/address/usdc.waybil.testnet) |

To deploy your own copy you need Rust, cargo-near and near-cli-rs, plus the deployer key in
your keychain. Then run `pnpm --filter @waybil/scripts deploy-contracts`. It creates the
accounts, builds and deploys the contract and prints its team and pool when it is done.

To run the landing page, copy `landing-page/.env.example` to `landing-page/.env.local`, then run
`pnpm --filter @waybil/landing-page dev` and open http://localhost:3000.

To run the frontend, use `pnpm --filter @waybil/fe dev` and open
http://localhost:3001/driver or http://localhost:3001/warehouse. These screens use labeled
demo fixtures while the backend and sign-in are being built. See [fe/README.md](fe/README.md)
for the gallery and production build commands. Backend run instructions will be added when it lands.

## NEAR technology used

<!-- e.g. Rust contracts, NEP-141, meta transactions, NEAR AI Cloud, Intents. -->

## Libraries & AI-generated code

<!-- List main libraries and which parts were written with AI assistance. -->

## Team

- Ancung — contracts
- Yeypayeyy — frontend
- Nasta — backend

## License

[MIT](LICENSE)
