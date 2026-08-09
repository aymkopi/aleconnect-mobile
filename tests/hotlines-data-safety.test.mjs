import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hotlines never fall back to callable mock contacts", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/hotlines.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /fallbackCategories/);
  assert.doesNotMatch(source, /09123456789|09876543210/);
  assert.match(source, /fetchHotlines/);
  assert.match(source, /Hotline contacts could not be loaded/);
});
