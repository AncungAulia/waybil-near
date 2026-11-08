# Driver screens

Issue #28. K1.1–K1.3, K2.1–K2.13 and K3.1–K3.4 live in `components/DriverScreen.tsx`.
`data/fixtures.ts` provides a shared-type Shipment for each drawn state.

Routes are `/driver`, `/driver/trips/1041`, `/driver/trips/1044`, `/driver/payouts`
and `/driver/companies`. Pages only read parameters and render the screen.
The gated gallery links every state at `/dev/gallery/screens/K2.1` and equivalent codes.

The backend and sign-in do not exist yet. These routes use sample data and do not move money.
The local demo transport in `src/lib/demo-delivery.ts` synchronizes delivery results between tabs.
Open trip #1041 in one tab and confirm code `7K2Q9F4M` in a warehouse tab to see the payout.
There is no driver payout action or wallet prompt. A problem report holds the payout instead.
Receipts are explicitly labeled as demos and link to the real testnet account, never an invented
transaction. The recorded-action components will take real transaction hashes after integration.

The QR is an inline SVG that encodes the eight-character code. It remains available after
the loaded page goes offline. Full offline navigation and live location reporting are pending
backend integration. The map uses the design's fictional geography and is labeled as a demo.
Location permission is requested only after the explanation and Continue button.
WhatsApp opens a composed message for the person to send.

To repeat the demo, remove `waybil-demo-delivery-v1` and `waybil-demo-report-v1` from browser
local storage. Gallery fixtures ignore stored delivery results.

New runtime dependencies for this batch are `qrcode.react` and `jsqr` (the shared warehouse scanner).
No authentication, transaction signing, private keys or unsigned relayer requests are simulated.
