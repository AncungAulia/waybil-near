# Warehouse design alignment

Reference: `design/waybil.pen`, board **7 · Warehouse**, including map card `s6sf2`.

Reviewed all 17 states at 1440, 834 and 390 pixels. The 51 captures passed horizontal
overflow and image-loading checks. Contact sheets and representative full screenshots
are in [warehouse/](warehouse/). Detailed results are in [validation.json](warehouse/validation.json).

The Warehouse map now uses the board's own vector artwork for each viewport and arrival
state, with both routes, truck positions, arrival labels, destination, attribution and
working zoom controls. Tablet places the map above the expected list. W1.2 mobile keeps
the arrival card and expected list, as drawn on the board.

The scanner, separate character fields, permission/code dialogs, goods selection,
report form, history badges, empty screens and result screens follow the Warehouse
layout, spacing, colors and illustration. The flashlight control is available when
the active camera reports torch support. Other roles keep their existing scanner defaults.

The design still draws six code boxes in W2.1 and W2.9. The UI uses eight boxes because
the product rule and working delivery code have eight characters. It keeps the board's
individual-box treatment. The report uses crates consistently with the demo shipment.

W1.2 keeps truck #1041 on its route and ends the yellow travelled leg at the truck.
W2.1 and W2.9 omit the outer code-field outline. W2.2 uses a grey pill for the camera
fallback, W2.10 matches the pink warning stamp and grouped code boxes in `jyVmv`, and
W2.4 uses the red circle with a cross. W2.7 removes the extra input focus frame and
centres the Add photo contents with the 4 px gap from `bzfWT`.

Browser checks passed for code normalization, invalid-code feedback, successful
confirmation, report count validation, report submission, map zoom, mobile code entry
and Escape dismissal. Frontend ESLint, typecheck, 17 tests, production build, formatting
and diff checks passed. No dependencies were added.

Maps and shipment actions remain local demos. No testnet transactions were submitted.
Camera permission and physical flashlight behavior need a compatible camera device.
This change is AI-generated and must retain that disclosure in any future PR.
