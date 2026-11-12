# 0015 · Random arrival codes

Status: accepted.

The arrival code was the shipment id written in base 36, so "00000001" for the first one.
Anyone could work out the code of any shipment, and a warehouse could confirm a delivery it
never saw.

- The backend now makes a random 8-character code per shipment once it is picked up and
  shows it only to the shipment's driver.
- The warehouse looks a code up through the backend, which answers only for shipments headed
  to that warehouse.
- The relay refuses `confirm_delivery` without the matching code.
- The contract is unchanged, so a warehouse account that pays its own gas could still call
  `confirm_delivery` directly. Closing that needs the code's hash on chain and a team
  upgrade, which is left for after the hackathon.
