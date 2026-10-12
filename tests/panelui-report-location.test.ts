import test from "node:test";
import assert from "node:assert/strict";
import { resolveReportPin } from "../src/features/maps/report-location-state.ts";
const meta = {
  municipalities: [{ code: "0505060000", name: "Legazpi City" }],
  barangays: [
    {
      code: "0505060010",
      name: "Bigaa",
      municipalityCode: "0505060000",
      municipalityName: "Legazpi City",
    },
  ],
};
test("pins require an in-bounds point and a barangay present in current form metadata", () => {
  assert.equal(
    resolveReportPin({ latitude: 14, longitude: 123.7 }, "0505060010", meta),
    null,
  );
  assert.equal(
    resolveReportPin(
      { latitude: Number.NaN, longitude: 123.7 },
      "0505060010",
      meta,
    ),
    null,
  );
  assert.equal(
    resolveReportPin({ latitude: 13.18, longitude: 123.7 }, "unknown", meta),
    null,
  );
  assert.deepEqual(
    resolveReportPin({ latitude: 13.18, longitude: 123.7 }, "0505060010", meta),
    {
      latitude: 13.18,
      longitude: 123.7,
      municipalityCode: "0505060000",
      barangayPsgc: "0505060010",
      purok: "",
      landmark: "",
      locationVerified: true,
    },
  );
});
