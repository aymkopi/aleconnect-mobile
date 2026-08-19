import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseResolvedPin,
  findCanonicalLocationByBarangayPsgc,
  formatResolvedAddress,
  resolvePsgcAddress,
} from "../src/features/reports/address.ts";

const meta = {
  municipalities: [
    {
      code: "11111111-1111-1111-1111-111111111111",
      name: "Legazpi City",
    },
  ],

  barangays: [
    {
      code: "0500501001",
      name: "Barangay 1 - Em's Barrio",
      municipalityCode: "11111111-1111-1111-1111-111111111111",
      municipalityName: "Legazpi City",
    },
  ],
};
test("barangay PSGC resolves the internal municipality id without reverse geocoding", () => {
  const resolved = findCanonicalLocationByBarangayPsgc("0500501001", meta);

  assert.equal(
    resolved.municipality?.code,
    "11111111-1111-1111-1111-111111111111",
  );

  assert.equal(resolved.barangay?.code, "0500501001");
});

test("reverse geocoding resolves Albay municipality and barangay PSGC", () => {
  const resolved = resolvePsgcAddress(
    {
      city: "City of Legazpi",
      district: "Barangay 1 - Em's Barrio",
      street: "Rizal Street",
      streetNumber: "12",
      region: "Albay",
      subregion: null,
      country: "Philippines",
      postalCode: null,
      name: null,
      isoCountryCode: "PH",
      timezone: null,
      formattedAddress: null,
    },
    meta,
  );

  assert.equal(
    resolved.municipalityCode,
    "11111111-1111-1111-1111-111111111111",
  );
  assert.equal(resolved.barangayPsgc, "0500501001");
  assert.equal(resolved.purok, "12 Rizal Street");
  assert.equal(
    formatResolvedAddress(resolved),
    "12 Rizal Street, Barangay 1 - Em's Barrio, Legazpi City, Albay",
  );
  assert.equal(canUseResolvedPin(resolved), true);
});

test("a verified Albay municipality can use the pin before manual barangay selection", () => {
  const resolved = resolvePsgcAddress(
    {
      city: "City of Legazpi",
      district: "Legazpi Port District",
      street: null,
      streetNumber: null,
      region: "Albay",
      subregion: null,
      country: "Philippines",
      postalCode: null,
      name: "4QX4+2H4",
      isoCountryCode: "PH",
      timezone: null,
      formattedAddress: null,
    },
    meta,
  );

  assert.equal(
    resolved.municipalityCode,
    "11111111-1111-1111-1111-111111111111",
  );
  assert.equal(resolved.barangayPsgc, "");
  assert.equal(canUseResolvedPin(resolved), true);
  assert.equal(canUseResolvedPin({ ...resolved, municipalityCode: "" }), false);
});
