import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/services/report-sync-events.ts", import.meta.url);

test("report sync coordinator persists ordering and projects accepted events", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /report_status_event_markers_v1/);
  assert.match(source, /ticketStatusChangedEventFromPushData/);
  assert.match(source, /isIncomingReportStatusEventNewer/);
  assert.match(source, /projectComplaintReportStatus/);
  assert.match(source, /markComplaintReportsForRevalidation/);
  assert.match(source, /AsyncStorage\.setItem/);
  assert.match(source, /subscribeReportStatusChanged/);
  assert.match(source, /subscribeReportRevalidationRequested/);
});

test("report sync serializes per-user ordering decisions before publishing", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /markerOperations = new Map/);
  assert.match(source, /serializeMarkerOperation\(userId/);
  assert.match(source, /markerMemory\.set\(userId, nextMarkers\)/);
  assert.match(source, /statusListeners\.forEach/);
  assert.match(source, /requestReportRevalidation\(userId\)/);
});

test("visible status publishes before best-effort disk persistence", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const publishIndex = source.indexOf("statusListeners.forEach");
  const persistIndex = source.indexOf("AsyncStorage.setItem");

  assert.ok(publishIndex >= 0);
  assert.ok(persistIndex >= 0);
  assert.ok(publishIndex < persistIndex);
  assert.match(source, /Failed to persist report status event ordering/);
});
