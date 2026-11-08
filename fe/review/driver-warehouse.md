# Driver and warehouse state checklist

Source: `design/waybil.pen`, Driver and Warehouse boards. Read together before implementation.
Every entry must render at 1440, 834 and 390 pixels in the gallery.

## Driver

- [x] K1.1 Trips
- [x] K1.2 Just got paid
- [x] K1.3 No trips yet
- [x] K2.1 Waiting for pickup
- [x] K2.2 Confirm pickup
- [x] K2.3 Location permission
- [x] K2.4 On the road
- [x] K2.5 Show QR
- [x] K2.6 Sending the money
- [x] K2.7 Taking longer
- [x] K2.8 Paid
- [x] K2.9 Problem reported
- [x] K2.10 Problem report
- [x] K2.11 Report settled
- [x] K2.12 Problem on the road
- [x] K2.13 No signal
- [x] K3.1 Payouts
- [x] K3.2 No payouts yet
- [x] K3.3 Companies
- [x] K3.4 New company invite

## Warehouse

- [x] W1.1 Arrivals
- [x] W1.2 Truck almost here
- [x] W1.3 Nothing expected
- [x] W2.1 Scan
- [x] W2.2 Camera permission
- [x] W2.3 Check and confirm
- [x] W2.4 Wrong warehouse
- [x] W2.5 Confirming
- [x] W2.6 Confirmed
- [x] W2.7 Report a problem
- [x] W2.8 Report sent
- [x] W2.9 Type code
- [x] W2.10 Code does not match
- [x] W2.11 Camera blocked
- [x] W2.12 Already confirmed
- [x] W3.1 History
- [x] W3.2 Nothing yet

## Data and integration boundaries

Use the demo story and shared Shipment types. Backend and authentication are unavailable.
Demo actions update a local fixture store, never send an unsigned action or invent a transaction hash.
Replace the demo transport with device signing and the relayer after authentication lands.
An arrival code has eight characters as specified by PRODUCT.md and the W2.9 board note.
The six boxes in W2.1 and W2.9 are inconsistent with that rule; render eight boxes.
Use crates consistently with demo-data.md even where the report drawing says boxes.
The fixture map uses the design's fictional places, not live location data.

## Validation

Completed 111 production gallery captures across 37 states at 1440, 834 and 390 pixels. No horizontal overflow or browser errors. Reviewed the six contact sheets and recaptured the four changed dialogs at all three widths. Lint, workspace typecheck, all 10 tests and formatting pass. Production builds pass with the gallery enabled and disabled. Browser checks cover automatic payout between tabs, invalid and duplicate codes, held payouts, report validation and shared report content, QR decoding while offline, a synthetic camera feed, denied camera fallback, reduced motion and Escape. See the screenshots and validation.json in driver-warehouse/. Backend signing, relaying and real receipts remain pending.
