import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("MapLibre module and style loading use one shared runtime", async () => {
  const [runtime, route, picker, preview] = await Promise.all([
    read("src/features/maps/map-runtime.ts"),
    read("src/app/(tabs)/reports/new.tsx"),
    read("src/features/maps/albay-location-picker-sheet.tsx"),
    read("src/features/maps/static-location-map.tsx"),
  ]);

  assert.match(runtime, /mapModulePromise \?\?=/);
  assert.match(runtime, /styles\/map-bright\.json\?v=2/);
  assert.match(runtime, /MAP_LOAD_TIMEOUT_MS/);
  assert.doesNotMatch(route, /import\("@maplibre\/maplibre-react-native"\)/);
  assert.doesNotMatch(picker, /import\("@maplibre\/maplibre-react-native"\)/);
  assert.doesNotMatch(preview, /import\("@maplibre\/maplibre-react-native"\)/);
  assert.match(picker, /loadMapLibreModule\(\)/);
  assert.match(preview, /loadMapLibreModule\(\)/);
});

test("map consumers ignore stale work and expose bounded fallbacks", async () => {
  const [picker, preview] = await Promise.all([
    read("src/features/maps/albay-location-picker-sheet.tsx"),
    read("src/features/maps/static-location-map.tsx"),
  ]);

  assert.match(picker, /reverseGeocodeRequestRef/);
  assert.match(picker, /requestId !== reverseGeocodeRequestRef\.current/);
  assert.match(picker, /duration=\{0\}/);
  assert.match(picker, /onDidFailLoadingMap/);
  assert.match(picker, /MAP_LOAD_TIMEOUT_MS/);
  assert.match(preview, /onDidFinishLoadingMap/);
  assert.match(preview, /onDidFailLoadingMap/);
  assert.match(preview, /MAP_LOAD_TIMEOUT_MS/);
});
