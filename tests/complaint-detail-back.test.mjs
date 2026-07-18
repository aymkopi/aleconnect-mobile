import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ticket detail uses the same safe handler for header and hardware back", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/complaints/[id].tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /router\.canGoBack\(\)/);
  assert.match(source, /router\.replace\("\/complaints"\)/);
  assert.match(source, /BackHandler\.addEventListener/);
  assert.match(source, /onPress=\{handleBack\}/);
});
