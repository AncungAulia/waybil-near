import { expect, it } from "vitest";
import { shortPlace } from "./regions";

it("shortens Indonesian place names the way people write them", () => {
  expect(shortPlace("Daerah Khusus Ibukota Jakarta")).toBe("DKI Jakarta");
  expect(shortPlace("Daerah Istimewa Yogyakarta")).toBe("DI Yogyakarta");
  expect(shortPlace("Kota Administrasi Jakarta Barat")).toBe("Jakarta Barat");
  expect(shortPlace("Kabupaten Administrasi Kepulauan Seribu")).toBe("Kepulauan Seribu");
  expect(shortPlace("Kabupaten Sleman")).toBe("Kab. Sleman");
  expect(shortPlace("Kota Bandung")).toBe("Kota Bandung");
  expect(shortPlace("Jawa Barat")).toBe("Jawa Barat");
  expect(shortPlace("California")).toBe("California");
});
