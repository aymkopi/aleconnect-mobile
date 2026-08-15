import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/services/reports.ts", import.meta.url);

test("report status sync patches cached rows without refreshing cache age", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /export async function projectComplaintReportStatus/);
  assert.match(source, /export function markComplaintReportsForRevalidation/);
  assert.match(source, /export function complaintReportsNeedRevalidation/);
  assert.match(source, /revalidate\?: boolean/);
  assert.match(source, /report\.id !== projection\.ticketId/);
  assert.match(source, /status: projection\.status/);
  assert.match(source, /fetchedAt: parsed\.fetchedAt/);
  assert.match(source, /value: patched\.page/);
});

test("event revalidation bypasses normal cache freshness but keeps request deduplication", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /const revalidate = Boolean\(options\?\.revalidate\)/);
  assert.match(source, /!revalidate/);
  assert.match(source, /complaintReportRequests\.run\(requestKey/);
  assert.match(
    source,
    /Boolean\(options\?\.force\)\s*&&\s*claimRefresh\(`/,
  );
  assert.doesNotMatch(source, /revalidate[^;\n]*claimRefresh/);
});

test("successful authoritative default-page refresh clears the stale marker", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /complaintReportRevalidationUsers\.delete\(userId\)/);
  assert.match(
    source,
    /complaintReportRevalidationUsers\.has\(userId\)[\s\S]*isStale: true/,
  );
});
