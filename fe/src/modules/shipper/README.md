# Shipper screens

Issue #27. The 39 drawn P1–P7 states have shared-type fixtures in `data/fixtures.ts`.
Thin routes render screens under `/shipper`, `/shipper/shipments`,
`/shipper/shipments/new`, `/shipper/shipments/[id]`, `/shipper/network` and `/shipper/credit`.
Every state is available through the gated gallery at `/dev/gallery/screens/P1.1` and equivalent codes.

These are labeled local demos. No wallet request, transaction, credit decision, invitation,
photo upload or destination registration is submitted. The map uses the design's fictional
geography. Pin placement previews a location without registering real coordinates.
Receipts link to the real testnet account and never invent a transaction hash.
Real signing, NearBlocks transaction receipts, authentication and backend integration remain pending.

Create a shipment using Sam Carter or Jordan Lee and a connected destination. Its cargo,
bill and due date survive navigation and reload. Approved shipments reserve credit;
cancellation releases it. Each new shipment gets a separate local ID.
The form uses `@waybil/shared` for money, advance and settlement calculations.

For the linked delivery demo, open `/warehouse` in another tab and enter `7K2Q9F4M`.
A clean delivery updates shipment #1041 and the driver payout. A problem report holds payment.
Settle the report from the shipper detail screen, then open `/driver` to see the chosen payout.
Paying the bill releases credit without changing the driver's settled payout.
Credit reviews and network invitations show the drawn previews without contacting anyone.

To reset, remove browser local-storage keys beginning with `waybil-demo-`.
Gallery fixtures ignore stored delivery and shipment results.
No dependencies were added for this batch.

The design's two-step wallet approval needs confirmation before integration. NEP-141 payments
do not use ERC-20 token allowances. The drawn waiting fixture is retained without inventing a call.
