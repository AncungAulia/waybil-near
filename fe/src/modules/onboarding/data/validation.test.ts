import { describe, expect, it } from "vitest";
import { companyErrors, documentError, driverErrors, phoneError } from "./validation";
import { SAMPLE_COMPANY, EMPTY_COMPANY } from "./fixtures";
describe("onboarding validation", () => {
  it("requires every company field and accepts the sample company", () => {
    expect(Object.keys(companyErrors(EMPTY_COMPANY, "+1"))).toHaveLength(
      Object.keys(EMPTY_COMPANY).length,
    );
    expect(companyErrors(SAMPLE_COMPANY, "+1")).toEqual({});
    expect(
      companyErrors(
        {
          ...SAMPLE_COMPANY,
          registration: "9120 0012 34",
          trips: "1.5",
          email: "hannah@",
          spend: "NaN",
        },
        "+1",
      ),
    ).toMatchObject({
      registration: expect.any(String),
      trips: expect.any(String),
      email: expect.any(String),
      spend: expect.any(String),
    });
  });
  it("uses the selected phone code and validates the drawn truck plate format", () => {
    expect(phoneError("207 555 0199", "+1")).toBeUndefined();
    expect(phoneError("207 55", "+1")).toBeTruthy();
    expect(phoneError("9123 4567", "+65")).toBeUndefined();
    expect(
      driverErrors({ name: "Sam Carter", phone: "207 555 0199", plate: "AB1234" }, "+1").plate,
    ).toBeTruthy();
    expect(
      Object.values(
        driverErrors({ name: "Sam Carter", phone: "207 555 0199", plate: "NWF-204" }, "+1"),
      ).some(Boolean),
    ).toBe(false);
  });
  it("accepts supported files at the size limit and rejects oversized, empty and other files", () => {
    expect(documentError({ size: 2 * 1024 * 1024, type: "application/pdf" })).toBeUndefined();
    expect(documentError({ size: 2 * 1024 * 1024 + 1, type: "application/pdf" })).toBeTruthy();
    expect(documentError({ size: 0, type: "image/jpeg" })).toBeTruthy();
    expect(documentError({ size: 10, type: "text/html" })).toBeTruthy();
  });
});
