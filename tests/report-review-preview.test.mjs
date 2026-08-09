import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report review uses the shared static map and an in-app evidence viewer", async () => {
  const [route, map, viewer] = await Promise.all([
    read("src/app/(tabs)/reports/new.tsx"),
    read("src/features/maps/static-location-map.tsx"),
    read("src/features/reports/components/evidence-photo-viewer.tsx"),
  ]);

  assert.match(route, /<StaticLocationMap/);
  assert.match(route, /<EvidencePhotoViewer/);
  assert.match(route, /accessibilityLabel=\{`View evidence photo/);
  assert.doesNotMatch(route, /Location saved/);
  assert.doesNotMatch(route, /\["Photos", `\$\{form\.photoUploads\.length\} attached`\]/);
  assert.match(map, /pointerEvents="none"/);
  assert.match(map, /dragPan=\{false\}/);
  assert.match(map, /accessibilityLabel=\{`Map showing \$\{label\}`\}/);
  assert.match(viewer, /<Modal/);
  assert.match(viewer, /accessibilityLabel="Close evidence viewer"/);
  assert.match(viewer, /contentFit="contain"/);
});

test("report review and completion show consumer-safe identity and committed actions", async () => {
  const route = await read("src/app/(tabs)/reports/new.tsx");

  assert.match(route, /profile\?\.fullName/);
  assert.match(route, /Reported by/);
  assert.doesNotMatch(route, /\["Account", form\.accountNumber\]/);
  assert.doesNotMatch(route, /priority|severity/i);
  assert.match(route, /Ticket Number/);
  assert.match(route, /follow progress in Reports/i);
  assert.match(route, /<ButtonText>Home<\/ButtonText>/);
  assert.doesNotMatch(route, /Go home while submitting|<ButtonText>Go home<\/ButtonText>/);
  assert.match(route, /accessibilityLiveRegion="polite"/);
  assert.match(route, /Ticket Number pending/);
});
