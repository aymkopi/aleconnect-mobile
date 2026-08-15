import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL(
  "../src/services/report-sync-events.ts",
  import.meta.url,
);

test("report sync coordinator persists ordering and projects accepted events", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /report_status_event_markers_v1/);
  assert.match(source, /ticketStatusChangedEventFromPushData/);
  assert.match(source, /isIncomingReportStatusEventNewer/);
  assert.match(source, /projectComplaintReportStatus/);
  assert.match(source, /fetchComplaintReportDetail/);
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
});

test("visible status publishes before targeted authoritative revalidation", async () => {
  const source = await readFile(sourceUrl, "utf8");

  const publishIndex = source.indexOf("statusListeners.forEach");
  const fetchIndex = source.indexOf(
    "fetchComplaintReportDetail(event.ticketId)",
  );

  assert.ok(publishIndex >= 0);
  assert.ok(fetchIndex >= 0);
  assert.ok(publishIndex < fetchIndex);
});

test("accepted v1 ticket push does not trigger immediate full-list revalidation", async () => {
  const source = await readFile(sourceUrl, "utf8");

  const handleStart = source.indexOf(
    "export async function handleReportStatusPush",
  );

  assert.ok(handleStart >= 0);

  const handleSource = source.slice(handleStart);

  assert.match(handleSource, /fetchComplaintReportDetail\(event\.ticketId\)/);

  assert.doesNotMatch(handleSource, /requestReportRevalidation\(userId\);/);
});

test("targeted revalidation corrects only the matching report status", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(
    source,
    /ticketId: event\.ticketId,[\s\S]*status: detail\.status/,
  );

  assert.match(source, /detail\.status !== event\.status/);
});

test("stale targeted responses cannot overwrite newer push events", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /markerMemory\.get\(userId\)\?\.\[event\.ticketId\]/);

  assert.match(source, /latestMarker\.changedAt !== nextMarker\.changedAt/);

  assert.match(source, /latestMarker\.revision !== nextMarker\.revision/);
});

test("targeted revalidation failure falls back to later full-list recovery", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /markComplaintReportsForRevalidation\(userId\)/);

  assert.match(source, /Failed to revalidate report after status push/);
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
