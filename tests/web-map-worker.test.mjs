import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
test("same-origin MapLibre worker and its relative shared import match the installed package", async () => {
  for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    assert.deepEqual(
      await readFile(new URL("../public/maplibre/" + name, import.meta.url)),
      await readFile(require.resolve("maplibre-gl/dist/" + name)),
    );
  }
});
