import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report detail presents restoration progress and general Service Memo updates", async () => {
  const [detail, card, data] = await Promise.all([
    read("src/app/(tabs)/reports/[id].tsx"),
    read("src/features/reports/extended-outage-status-card.tsx"),
    read("src/features/reports/data.ts"),
  ]);
  assert.match(detail, /ExtendedOutageStatusCard/);
  assert.match(detail, /Service Memo updates/);
  assert.match(detail, /consumerUpdates/);
  assert.match(card, /Extended outage — Restoration in progress/);
  assert.match(card, /Next update by/);
  assert.doesNotMatch(card, /Public update history/);
  assert.match(data, /publicUpdates: IncidentPublicUpdate\[\]/);
  assert.match(data, /consumerUpdates: ConsumerServiceMemoUpdate\[\]/);
});

test("report detail parser supports general consumer updates and legacy public-update fallback", async () => {
  const { parseReportDetailResponse } = await import(
    new URL("../src/features/reports/data.ts", import.meta.url)
  );
  const base = {
    id: "ticket-1",
    ticketNumber: "ALECO-260802-00001",
    title: "Voltage issue",
    status: "in_progress",
    createdAt: "2026-08-02T00:00:00.000Z",
    typeId: "type-1",
    typeTitle: "Voltage issue",
    categoryId: "category-1",
    categoryTitle: "Power quality",
    history: [],
    publicUpdates: [],
  };

  const general = parseReportDetailResponse({
    report: {
      ...base,
      consumerUpdates: [
        {
          id: "addendum-correction",
          type: "correction",
          body: "Correction: the affected location is Purok 6.",
          publishedAt: "2026-08-18T05:00:00.000Z",
          operationalPhase: null,
          estimateStartAt: null,
          estimateEndAt: null,
          estimateUnavailableReason: null,
          nextUpdateDueAt: null,
          classification: null,
        },
      ],
    },
  });
  assert.equal(general.consumerUpdates.length, 1);
  assert.equal(general.consumerUpdates[0].type, "correction");
  assert.equal(general.consumerUpdates[0].operationalPhase, null);
  assert.equal(general.consumerUpdates[0].nextUpdateDueAt, null);

  const legacy = parseReportDetailResponse({
    report: {
      ...base,
      publicUpdates: [
        {
          id: "legacy-progress",
          phase: "assessing_damage",
          publicNote: "Crew is checking the affected line.",
          estimateStartAt: null,
          estimateEndAt: null,
          estimateUnavailableReason: "Awaiting field assessment.",
          nextUpdateDueAt: "2026-08-18T06:00:00.000Z",
          classification: "standard",
          publishedAt: "2026-08-18T05:00:00.000Z",
        },
      ],
    },
  });
  assert.equal(legacy.consumerUpdates.length, 1);
  assert.equal(legacy.consumerUpdates[0].id, "legacy-progress");
  assert.equal(legacy.consumerUpdates[0].type, "operational_note");
  assert.equal(legacy.consumerUpdates[0].body, "Crew is checking the affected line.");
  assert.equal(legacy.consumerUpdates[0].operationalPhase, "assessing_damage");
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
  assert.equal(
    parseReportDetailResponse({
      report: { ...base, imageUrlsExpiresAt: "2026-08-13T08:00:00" },
    }).imageUrlsExpiresAt,
    null,
  );
  assert.equal(
    parseReportDetailResponse({
      report: { ...base, imageUrlsExpiresAt: "2026-08-13T08:00:00.000Z" },
    }).imageUrlsExpiresAt,
    "2026-08-13T08:00:00.000Z",
  );
  assert.throws(
    () => parseReportDetailResponse({ report: { ...base, ticketNumber: "" } }),
    /incomplete/i,
  );
});

test("report detail normalizes the optional Service Memo message and limits it to verified updates", async () => {
  const {
    buildReportDetailTimeline,
    parseReportDetailResponse,
    consumerMessageTimelineIndex,
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

  const timeline = [
    {
      id: "verified-earlier",
      fromStatus: "under_review",
      toStatus: "verified",
      note: null,
      changedAt: "2026-08-13T01:00:00.000Z",
    },
    {
      id: "in-progress",
      fromStatus: "verified",
      toStatus: "in_progress",
      note: null,
      changedAt: "2026-08-13T02:00:00.000Z",
    },
    {
      id: "verified-latest",
      fromStatus: "in_progress",
      toStatus: "verified",
      note: null,
      changedAt: "2026-08-13T03:00:00.000Z",
    },
  ];
  assert.equal(
    consumerMessageTimelineIndex(timeline, "Repairs are being coordinated."),
    2,
  );
  assert.equal(
    consumerMessageTimelineIndex([timeline[1]], "Repairs are being coordinated."),
    null,
  );
  assert.equal(
    consumerMessageTimelineIndex(
      buildReportDetailTimeline([], "verified", base.createdAt),
      "Repairs are being coordinated.",
    ),
    0,
  );
  assert.equal(
    consumerMessageTimelineIndex(
      [
        { ...timeline[0], changedAt: "2026-08-13T04:00:00.000Z" },
        { ...timeline[2], changedAt: "2026-08-13T04:00:00.000Z" },
      ],
      "Repairs are being coordinated.",
    ),
    1,
  );
  assert.equal(
    consumerMessageTimelineIndex(
      [
        { ...timeline[0], changedAt: "2026-08-13T03:00:00.000Z" },
        { ...timeline[2], changedAt: "2026-08-14T04:00:00" },
      ],
      "Repairs are being coordinated.",
    ),
    0,
  );
});

test("report detail uses later history order when all verified timestamps are invalid", async () => {
  const { consumerMessageTimelineIndex } = await import(
    new URL("../src/features/reports/data.ts", import.meta.url),
  );

  assert.equal(
    consumerMessageTimelineIndex(
      [
        { toStatus: "verified", changedAt: "not an instant" },
        { toStatus: "verified", changedAt: "2026-08-14T04:00:00" },
      ],
      "Repairs are being coordinated.",
    ),
    1,
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
