/* The drivers and destinations the demo P2 form offers. */
export const DRIVERS = [
  /* The board draws Sam's avatar as "SC", so the avatar gets the full name. */
  { name: "Sam", full: "Sam Carter", plate: "NWF-204", trips: 12 },
  { name: "Jordan Lee", full: "Jordan Lee", plate: "JLE-118", trips: 4 },
  { name: "Chris Novak", full: "Chris Novak", plate: "", trips: 0 },
];
export const PLACES = [
  {
    name: "Harbor Hub",
    street: "9 Pier Street",
    address: "9 Pier Street, Harbor City",
    meta: "Lena receives here. 8 trips so far.",
    linked: true,
  },
  {
    name: "Riverton branch",
    street: "40 River Road",
    address: "40 River Road, Riverton",
    meta: "Receiver not linked yet",
    linked: false,
  },
  {
    name: "Millbrook depot",
    street: "12 Mill Lane",
    address: "12 Mill Lane, Millbrook",
    meta: "Chris receives here. 3 trips so far.",
    linked: true,
  },
];
