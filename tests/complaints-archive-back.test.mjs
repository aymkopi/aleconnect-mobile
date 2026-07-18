import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("report archive back navigation always has a complaints parent fallback", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/complaints/list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /router\.canGoBack\(\)/);
  assert.match(source, /router\.replace\("\/complaints"\)/);
  assert.match(source, /BackHandler\.addEventListener/);
  assert.match(source, /onPress=\{handleBack\}/);
});
