# 0014 · Places, trips and truck location

Status: accepted.

Shippers need to see where their goods are. Until now an address was plain text and the map
was a drawing from the design file.

- A shipper saves pickup points and receiving addresses as places, each with a pin. Address
  search goes through the backend to Photon, which allows search as you type. Public
  Nominatim does not, so it is not used.
- A shipment's trip is kept by the backend, not the contract. The shipper stores it right
  after recording the shipment. The contract stays as it is, so no team upgrade is needed.
- The road is drawn once per trip by OpenRouteService when a key is set, and falls back to a
  straight line. Screens say "Direct route preview" for the fallback.
- The driver's phone shares its location only while the shipment is picked up, at most once
  every 30 seconds. Only the newest point is kept, and investors never see it.
- Screens read trips every 10 seconds, the same as the rest of the app. There is no push
  channel, which keeps the backend to one more table and no new service.
- Map tiles use the free CARTO Positron style through MapLibre GL, with the OpenStreetMap
  credit on every map.
- For the demo, `DEMO_LOCATION_SIMULATION=on` moves the truck along the route after pickup,
  labelled "Demo · simulated location". Delivery is still confirmed only by the warehouse.
