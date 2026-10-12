import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const destination = fileURLToPath(
  new URL("../public/maplibre/", import.meta.url),
);
await mkdir(destination, { recursive: true });
// MapLibre v6 workers import the shared module by relative path; keep both at the installed version.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(
    require.resolve("maplibre-gl/dist/" + file),
    destination + file,
  );
}
await copyFile(
  join(dirname(require.resolve("maplibre-gl/package.json")), "LICENSE.txt"),
  destination + "LICENSE.txt",
);
