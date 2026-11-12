import { expect, it } from "vitest";
import { isValidPlate, normalizePlate } from "./plate";

it("accepts plates from different countries and tidies them", () => {
  for (const plate of ["B 1234 EOF", "NWF-204", "AB12 CDE", "AB1234", "b 1234  eof", "7ABC123"])
    expect(isValidPlate(plate)).toBe(true);
  expect(normalizePlate("  b 1234  eof ")).toBe("B 1234 EOF");
});

it("rejects plates without both letters and numbers, odd characters or the wrong length", () => {
  for (const plate of ["1234", "ABCD", "B@1234", "B", "B--1234", "AB 1 2 3 4 5", "A1".repeat(9)])
    expect(isValidPlate(plate)).toBe(false);
});
