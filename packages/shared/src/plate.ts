/*
 * Truck plates look different in every country: "B 1234 EOF" in Indonesia, "NWF-204" in the
 * demo, "AB12 CDE" in the UK. So a plate is letters and numbers, in up to four groups split by
 * a space or a hyphen, with at least one letter and one number, 2 to 15 characters long.
 */
const PLATE = /^(?=[A-Z0-9 -]{2,15}$)(?=.*[A-Z])(?=.*\d)[A-Z0-9]+(?:[ -][A-Z0-9]+){0,3}$/;

/** Upper case, trimmed, single spaces: "b 1234  eof" becomes "B 1234 EOF". */
export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, " ");
}

/** True for a plate in the shape above, after `normalizePlate`. */
export function isValidPlate(plate: string): boolean {
  return PLATE.test(normalizePlate(plate));
}
