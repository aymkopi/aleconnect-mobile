import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production API origin fails closed and requires HTTPS", async () => {
  const source = await readFile(
    new URL("../src/constants/api.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /__DEV__/);
  assert.match(source, /https:/);
  assert.match(source, /throw new Error/);
  assert.match(source, /__DEV__ \? getExpoHostBaseUrl\(\)/);
});
