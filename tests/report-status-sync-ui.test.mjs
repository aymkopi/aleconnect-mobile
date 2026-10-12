import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutUrl = new URL("../src/app/_layout.tsx", import.meta.url);

test("root bridge routes ticket pushes and lifecycle recovery into report sync", async () => {
  const source = await readFile(layoutUrl, "utf8");

  assert.match(source, /handleReportStatusPush/);
  assert.match(source, /requestReportRevalidation/);
  assert.match(source, /ticketStatusChangedEventFromPushData/);
  assert.match(source, /AppState\.addEventListener\("change"/);
  assert.match(source, /NetInfo\.addEventListener/);
  assert.match(source, /clearAdvisoryCache/);
  assert.match(source, /invalidateNotifications/);
  assert.doesNotMatch(source, /clearComplaintCache/);
  assert.match(
    source,
    /if \(ticketStatusChangedEventFromPushData\(data\)\)[\s\S]*handleReportStatusPush\(data, userId\)[\s\S]*else \{\s*requestReportRevalidation\(userId\)/,
  );
});
