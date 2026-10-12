import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile advisory readers keep nullable legacy dates and normalize older cached records", async () => {
  const service = await read("src/services/advisories.ts");
  assert.match(service, /scheduledStartAt: string \| null/);
  assert.match(service, /scheduledEndAt: string \| null/);
  assert.match(service, /normalize.*Advisory|normaliz/);
  assert.match(service, /scheduledStartAt.*null|scheduledEndAt.*null/);
  assert.doesNotMatch(service, /scheduledStartAt: string;/);
  assert.doesNotMatch(service, /scheduledEndAt: string;/);
});
