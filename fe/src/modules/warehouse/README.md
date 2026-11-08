# Warehouse screens

Issue #29. W1.1–W1.3, W2.1–W2.12 and W3.1–W3.2 live in `components/WarehouseScreen.tsx`.
`data/fixtures.ts` provides a shared-type Shipment for each drawn state.

Routes are `/warehouse`, `/warehouse/scan` and `/warehouse/history`.
Every board state is linked from the gated gallery at `/dev/gallery/screens/W2.1` and equivalent codes.

The camera is requested only after Continue on the explanation screen. `QrScanner` uses
`getUserMedia` and `jsqr`, stops every camera track when closed and falls back to an eight-character
code when permission is denied or a camera is unavailable. `DeliveryQr` uses `qrcode.react`.
Gallery scanning does not request camera access.

The backend, authentication and signed relayer are pending. This batch uses a labeled local demo
transport and does not move money. Code `7K2Q9F4M` opens shipment #1041 for Harbor Hub.
Confirmation updates an open driver tab automatically. Submitting the code again shows Already
confirmed. Reports store the count, note and selected photos locally and hold the payout.
Receipts link to the testnet account and are labeled as demos, without invented transaction hashes.
Wrong warehouse and other exceptional states have independent gallery fixtures.

Photos are restricted to JPG/PNG under 2 MB each. Reports validate whole counts from 0 to 120.
Backend report upload/hashing, account authorization, concurrent confirmation protection and real
transaction receipts must replace the fixture boundary when the backend arrives.
