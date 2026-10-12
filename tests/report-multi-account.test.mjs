import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("offline report sync fails closed on stale identity, account, or revision without deleting the protected draft", async () => {
  const [queue, access] = await Promise.all([
    read("src/services/report-queue.ts"),
    read("src/services/report-queue-access.ts"),
  ]);
  assert.match(access, /QUEUE_ACCESS_STALE/);
  assert.match(queue, /evaluateQueuedReportAccess/);
  assert.match(queue, /nonRetryable: true/);
  assert.doesNotMatch(queue, /filter\(\(entry\) => entry\.id !== inaccessibleId\)/);
  assert.doesNotMatch(queue, /Math\.max\([\s\S]{0,300}accessRevision/);
  assert.match(queue, /await replaceQueueItem\(failed\)/);
  assert.match(queue, /item\.status === "queued"/);
  assert.match(queue, /item\.nonRetryable/);
});

test("same-identity removed-account drafts stay visible for safe failure while other identities remain private", async () => {
  const [queue, access] = await Promise.all([
    read("src/services/report-queue.ts"),
    read("src/services/report-queue-access.ts"),
  ]);
  assert.match(queue, /isQueuedReportVisible\(item, scope\)/);
  assert.match(access, /queued\.identityUserId === current\.identityUserId/);
});
