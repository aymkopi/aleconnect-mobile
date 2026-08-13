import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report detail presents public phase, estimate, deadline, and history", async () => {
  const [detail, card, data] = await Promise.all([
    read("src/app/(tabs)/reports/[id].tsx"),
    read("src/features/reports/extended-outage-status-card.tsx"),
    read("src/features/reports/data.ts"),
  ]);
  assert.match(detail, /ExtendedOutageStatusCard/);
  assert.match(card, /Extended outage — Restoration in progress/);
  assert.match(card, /Next update by/);
  assert.match(card, /Public update history/);
  assert.match(data, /publicUpdates: IncidentPublicUpdate\[\]/);
});

test("report detail parser rejects incomplete wrappers and never exposes object keys", async () => {
  const { parseReportDetailResponse } = await import(
    new URL("../src/features/reports/data.ts", import.meta.url)
  );
  const base = {
    id: "ticket-1",
    ticketNumber: "ALECO-260802-00001",
    title: "Voltage issue",
    status: "under_review",
    createdAt: "2026-08-02T00:00:00.000Z",
    typeId: "type-1",
    typeTitle: "Voltage issue",
    categoryId: "category-1",
    categoryTitle: "Power quality",
    history: [],
    publicUpdates: [],
    imageUrls: [
      "ticket-evidence/consumer/draft/1.webp",
      "https://evidence.example/1.webp",
    ],
  };

  assert.deepEqual(parseReportDetailResponse({ report: base }).imageUrls, [
    "https://evidence.example/1.webp",
  ]);
  assert.throws(
    () => parseReportDetailResponse({ report: { ...base, ticketNumber: "" } }),
    /incomplete/i,
  );
});

test("report detail normalizes the optional Service Memo message and limits it to verified updates", async () => {
  const {
    parseReportDetailResponse,
    shouldDisplayConsumerMessageOnTimelineItem,
  } = await import(new URL("../src/features/reports/data.ts", import.meta.url));
  const base = {
    id: "ticket-1",
    ticketNumber: "ALECO-260802-00001",
    title: "Voltage issue",
    status: "verified",
    createdAt: "2026-08-02T00:00:00.000Z",
    typeId: "type-1",
    typeTitle: "Voltage issue",
    categoryId: "category-1",
    categoryTitle: "Power quality",
    history: [],
    publicUpdates: [],
  };

  assert.equal(
    parseReportDetailResponse({
      report: { ...base, consumerMessage: "  Repairs are being coordinated.  " },
    }).consumerMessage,
    "Repairs are being coordinated.",
  );
  assert.equal(
    parseReportDetailResponse({ report: { ...base, consumerMessage: { text: "private" } } })
      .consumerMessage,
    null,
  );
  assert.equal(parseReportDetailResponse({ report: base }).consumerMessage, null);
  assert.equal(
    shouldDisplayConsumerMessageOnTimelineItem(" VERIFIED ", "Repairs are being coordinated."),
    true,
  );
  assert.equal(
    shouldDisplayConsumerMessageOnTimelineItem("in_progress", "Repairs are being coordinated."),
    false,
  );
});

test("report detail retains content, exposes retry, and refreshes expired evidence once", async () => {
  const detail = await read("src/app/(tabs)/reports/[id].tsx");

  assert.match(detail, /EvidencePhotoViewer/);
  assert.match(detail, /cachePolicy="memory-disk"/);
  assert.match(detail, /refreshEvidenceOnce/);
  assert.match(detail, /refreshEvidence: true/);
  assert.match(detail, /Retry/);
  assert.doesNotMatch(detail, /isLoading \|\| !report/);
});
