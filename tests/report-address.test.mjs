import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseResolvedPin,
  findCanonicalLocationByBarangayPsgc,
  formatResolvedAddress,
  resolveHomeReportLocation,
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

const fallbackMeta = {
  municipalities: [
    ...meta.municipalities,
    {
      code: "22222222-2222-2222-2222-222222222222",
      name: "Daraga",
    },
  ],
  barangays: [
    ...meta.barangays,
    {
      code: "0500501002",
      name: "Fallback Barangay",
      municipalityCode: "22222222-2222-2222-2222-222222222222",
      municipalityName: "Daraga",
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

test("home report location uses the user's saved structured address", () => {
  const resolved = resolveHomeReportLocation(meta, {
    municipalityCode: "11111111-1111-1111-1111-111111111111",
    barangayPsgc: "0500501001",
    purokOrStreet: "Purok 7",
    landmark: "Beside the covered court",
    homeCoordinates: { latitude: 13.1391, longitude: 123.7345 },
  });

  assert.deepEqual(resolved, {
    municipalityCode: "11111111-1111-1111-1111-111111111111",
    barangayPsgc: "0500501001",
    purok: "Purok 7",
    landmark: "Beside the covered court",
    latitude: 13.1391,
    longitude: 123.7345,
    locationVerified: true,
  });
});

test("saved canonical home address wins over a conflicting detected barangay", () => {
  const resolved = resolveHomeReportLocation(
    fallbackMeta,
    {
      municipalityCode: "11111111-1111-1111-1111-111111111111",
      barangayPsgc: "0500501001",
      homeCoordinates: { latitude: 13.1391, longitude: 123.7345 },
    },
    "0500501002",
  );

  assert.equal(resolved.municipalityCode, meta.municipalities[0].code);
  assert.equal(resolved.barangayPsgc, meta.barangays[0].code);
  assert.equal(resolved.locationVerified, true);
});

test("mismatched saved home codes use the detected canonical fallback", () => {
  const resolved = resolveHomeReportLocation(
    fallbackMeta,
    {
      municipalityCode: "22222222-2222-2222-2222-222222222222",
      barangayPsgc: "0500501001",
      homeCoordinates: { latitude: 13.1391, longitude: 123.7345 },
    },
    "0500501002",
  );

  assert.equal(resolved.municipalityCode, fallbackMeta.municipalities[1].code);
  assert.equal(resolved.barangayPsgc, fallbackMeta.barangays[1].code);
  assert.equal(resolved.locationVerified, true);
});

test("legacy home profiles without codes use the detected canonical fallback", () => {
  const resolved = resolveHomeReportLocation(
    fallbackMeta,
    {
      homeCoordinates: { latitude: 13.1391, longitude: 123.7345 },
    },
    "0500501002",
  );

  assert.equal(resolved.municipalityCode, fallbackMeta.municipalities[1].code);
  assert.equal(resolved.barangayPsgc, fallbackMeta.barangays[1].code);
  assert.equal(resolved.locationVerified, true);
});

test("out-of-Albay saved coordinates cannot verify a report location", () => {
  const resolved = resolveHomeReportLocation(meta, {
    municipalityCode: "11111111-1111-1111-1111-111111111111",
    barangayPsgc: "0500501001",
    homeCoordinates: { latitude: 14, longitude: 123.7345 },
  });

  assert.equal(resolved.municipalityCode, meta.municipalities[0].code);
  assert.equal(resolved.barangayPsgc, meta.barangays[0].code);
  assert.equal(resolved.locationVerified, false);
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
