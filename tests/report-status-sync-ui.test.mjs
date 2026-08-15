import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutUrl = new URL("../src/app/_layout.tsx", import.meta.url);
const recentUrl = new URL("../src/app/(tabs)/reports/index.tsx", import.meta.url);
const archiveUrl = new URL("../src/app/(tabs)/reports/list.tsx", import.meta.url);

test("root bridge routes ticket pushes and lifecycle recovery into report sync", async () => {
  const source = await readFile(layoutUrl, "utf8");

  assert.match(source, /handleReportStatusPush/);
  assert.match(source, /requestReportRevalidation/);
  assert.match(source, /AppState\.addEventListener\("change"/);
  assert.match(source, /NetInfo\.addEventListener/);
  assert.match(source, /clearAdvisoryCache/);
  assert.match(source, /invalidateNotifications/);
  assert.doesNotMatch(source, /clearComplaintCache/);
  assert.match(source, /if \(!handled\) requestReportRevalidation\(userId\)/);
});

test("recent and archive report surfaces subscribe to immediate status and revalidation events", async () => {
  for (const url of [recentUrl, archiveUrl]) {
    const source = await readFile(url, "utf8");
    assert.match(source, /subscribeReportStatusChanged/);
    assert.match(source, /subscribeReportRevalidationRequested/);
    assert.match(source, /report\.id === event\.ticketId/);
    assert.match(source, /status: event\.status/);
    assert.match(source, /revalidate: true/);
  }
});
