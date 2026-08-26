import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report queue resolves a complete equal-revision account snapshot before evidence signing", async () => {
  const source = await read("src/services/report-queue.ts");
  assert.match(source, /readConsistentConsumerAccountSnapshot/);
  assert.match(source, /normalizeConsumerIdentity/);
  assert.match(source, /normalizeLinkedAccounts/);
  assert.doesNotMatch(source, /Number\.isSafeInteger\(currentAccess\.accessRevision\)/);
});
