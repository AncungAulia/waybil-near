import { describe, expect, it } from "vitest";
import {
  companyErrors,
  countryForDialCode,
  documentError,
  driverErrors,
  phoneError,
  toE164,
} from "./validation";
import { SAMPLE_COMPANY, EMPTY_COMPANY } from "./fixtures";
describe("onboarding validation", () => {
  it("requires every company field and accepts the sample company", () => {
    /* Every field but the phone country, which the form fills from the company's country. */
    expect(Object.keys(companyErrors(EMPTY_COMPANY, "US"))).toHaveLength(
      Object.keys(EMPTY_COMPANY).length - 1,
    );
    expect(companyErrors(EMPTY_COMPANY, "US").phoneCountry).toBeUndefined();
    expect(companyErrors(SAMPLE_COMPANY, "US")).toEqual({});
    expect(
      companyErrors(
        {
          ...SAMPLE_COMPANY,
          registration: "9120 0012 34",
          trips: "1.5",
          email: "hannah@",
          spend: "NaN",
        },
        "US",
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
    expect(phoneError("0812 3456 7890", "ID")).toBeUndefined();
    expect(phoneError("812 34", "ID")).toBe("Enter a valid phone number for Indonesia.");
    expect(phoneError("207 555", "GB")).toBeTruthy();
  });
  it("sends phone numbers in E.164 and finds the main country for a shared code", () => {
    expect(toE164("0812-3456-7890", "ID")).toBe("+6281234567890");
    expect(toE164("(207) 555-0142", "+1")).toBe("+12075550142");
    expect(toE164("812 34", "ID")).toBeUndefined();
    expect(countryForDialCode("+1")).toBe("US");
    expect(countryForDialCode("+62")).toBe("ID");
    expect(
      driverErrors({ name: "Sam Carter", phone: "207 555 0199", plate: "1234" }, "+1").plate,
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
