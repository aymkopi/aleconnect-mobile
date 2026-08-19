import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportSource = readFileSync(
  new URL("../src/app/(tabs)/reports/new.tsx", import.meta.url),
  "utf8",
);

const pickerSource = readFileSync(
  new URL(
    "../src/features/maps/albay-location-picker-sheet.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("municipality and barangay cannot be manually changed after map selection", () => {
  assert.doesNotMatch(reportSource, /label="Municipality"/);
  assert.doesNotMatch(reportSource, /label="Barangay"/);

  assert.match(reportSource, /municipalityCode:\s*address\.municipalityCode/);

  assert.match(reportSource, /barangayPsgc:\s*address\.barangayPsgc/);
});

test("report location is changed through the map picker", () => {
  assert.match(reportSource, /Change location/);
  assert.match(reportSource, /Choose location/);
  assert.match(pickerSource, /Confirm location/);
});
test("home address switching preserves the last manual report location", () => {
  assert.match(reportSource, /lastManualLocationRef/);

  assert.match(reportSource, /snapshotReportLocation\(current\)/);

  assert.match(
    reportSource,
    /const previousManualLocation = lastManualLocationRef\.current/,
  );

  assert.match(
    reportSource,
    /isVerifiedReportLocation\(previousManualLocation\)/,
  );
});
test("map confirmation becomes the latest manual location and exits home mode", () => {
  assert.match(reportSource, /const nextLocation: ReportLocationSnapshot/);

  assert.match(reportSource, /lastManualLocationRef\.current = nextLocation/);

  assert.match(reportSource, /useHomeAddress: false/);
});
test("home address control derives its next state from report form state", () => {
  assert.match(reportSource, /const handleHomeAddressPress = \(\) =>/);

  assert.match(reportSource, /setForm\(\(current\) =>/);

  assert.match(reportSource, /if \(!current\.useHomeAddress\)/);

  assert.match(reportSource, /onPress=\{handleHomeAddressPress\}/);

  assert.doesNotMatch(reportSource, /onChange=\{\(selected\) =>/);
});
test("home address source is controlled by report form state only", () => {
  assert.match(reportSource, /const handleHomeAddressPress = \(\) =>/);

  assert.match(reportSource, /accessibilityRole="checkbox"/);

  assert.match(reportSource, /onPress=\{handleHomeAddressPress\}/);

  assert.doesNotMatch(reportSource, /<Checkbox[\s>]/);

  assert.doesNotMatch(reportSource, /onChange=\{\(selected\) =>/);
});
