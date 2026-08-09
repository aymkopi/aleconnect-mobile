import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("report submissions persist one backend idempotency key", async () => {
  const serviceSource = await readFile(
    new URL("../src/services/reports.ts", import.meta.url),
    "utf8",
  );
  const routeSource = await readFile(
    new URL("../src/app/(tabs)/reports/new.tsx", import.meta.url),
    "utf8",
  );

  assert.match(serviceSource, /idempotencyKey:\s*string/);
  assert.match(
    routeSource,
    /idempotencyKey:\s*`mobile:\$\{reportId\}`/,
  );
});

test("evidence compression bundles the native image manipulator eagerly", async () => {
  const source = await readFile(
    new URL("../src/utils/evidence-image-processing.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import \* as ImageManipulator from "expo-image-manipulator"/,
  );
  assert.doesNotMatch(source, /await import\("expo-image-manipulator"\)/);
});
