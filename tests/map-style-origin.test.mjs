import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("MapLibre loads static styles from the Pages origin in production", async () => {
  const apiSource = await readFile(
    new URL("../src/constants/api.ts", import.meta.url),
    "utf8",
  );
  const complaintSource = await readFile(
    new URL("../src/app/(tabs)/reports/new.tsx", import.meta.url),
    "utf8",
  );

  assert.match(apiSource, /":\/\/api\.aleconnect\.app",\s*"\:\/\/aleconnect\.app"/);
  assert.match(
    complaintSource,
    /`\$\{aleconnectAssetBaseUrl\}\/styles\/map-bright\.json\?v=2`/,
  );
  assert.doesNotMatch(complaintSource, /aleconnectApiBaseUrl/);
});
