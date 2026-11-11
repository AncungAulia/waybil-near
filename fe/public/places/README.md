# Places

Country, province and city names for the shipper company form. The form loads them on demand.

- `index.json` holds `attribution`, `countries` (`iso2`, `name`) and `states`, a map from a
  country's ISO2 code to its provinces (`id`, `name`).
- `<ISO2>.json` maps each province `id` of that country to its list of city names.

## Sources

- World data comes from the
  [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database),
  licensed under the Open Database License (ODbL) v1.0. Only the names are kept.
- Indonesia is replaced with the official Kemendagri list (Kepmendagri No 300.2.2-2430
  Tahun 2025, 38 provinces and 514 regencies and cities), taken from
  [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) under the MIT license. Indonesian
  province ids are the Kemendagri codes.
