import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notifications uses one parent-safe handler for visible and hardware back", async () => {
  const source = await readFile(
    new URL("../src/app/notifications.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /router\.canGoBack\(\)/);
  assert.match(source, /router\.replace\("\/home"\)/);
  assert.match(source, /BackHandler\.addEventListener/);
  assert.match(source, /onBack=\{handleBack\}/);
});
