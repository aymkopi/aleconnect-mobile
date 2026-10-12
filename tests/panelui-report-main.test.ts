import test from "node:test";
import assert from "node:assert/strict";
import {
  getReportTabCounts,
  filterReportTab,
  filterReportPeriod,
} from "../src/features/reports/main-filter.ts";
import type { Report } from "../src/features/reports/data.ts";
const rows = [
  "under_review",
  "verified",
  "dispatched",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
  null,
].map(
  (status, id) =>
    ({ id: String(id), status, createdAt: "2026-09-30T16:05:00Z" }) as Report,
);
test("badges preserve all canonical statuses", () => {
  assert.deepEqual(getReportTabCounts(rows), { all: 8, open: 4, resolved: 1 });
  assert.equal(filterReportTab(rows, "open").length, 4);
  assert.equal(filterReportTab(rows, "resolved")[0].status, "resolved");
});
test("period uses Manila month and rejects invalid dates", () => {
  assert.equal(
    filterReportPeriod(rows, "month", new Date("2026-10-01T00:00:00Z")).length,
    8,
  );
  assert.equal(
    filterReportPeriod([{ ...rows[0], createdAt: "invalid" }], "month").length,
    0,
  );
  assert.equal(
    filterReportPeriod(rows, "month", new Date("2026-09-30T00:00:00Z")).length,
    0,
  );
});

test("overview periods cover previous month, three calendar months, year and inclusive custom dates in Manila", () => {
  const dates = [
    "2026-07-31T15:59:59Z",
    "2026-07-31T16:00:00Z",
    "2026-08-31T16:00:00Z",
    "2026-09-30T16:00:00Z",
    "2025-12-31T15:59:59Z",
    "2025-12-31T16:00:00Z",
    "invalid",
  ].map((createdAt, id) => ({ id: String(id), createdAt }) as Report);
  const now = new Date("2026-10-09T00:00:00Z");
  assert.deepEqual(
    filterReportPeriod(dates, "last-month", now).map((r) => r.id),
    ["2"],
  );
  assert.deepEqual(
    filterReportPeriod(dates, "quarter", now).map((r) => r.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    filterReportPeriod(dates, "year", now).map((r) => r.id),
    ["0", "1", "2", "3", "5"],
  );
  assert.deepEqual(
    filterReportPeriod(dates, "custom", now, "2026-09-01", "2026-10-01").map(
      (r) => r.id,
    ),
    ["2", "3"],
  );
  assert.deepEqual(
    filterReportPeriod(dates, "custom", now, "2026-10-01", "2026-09-01"),
    [],
  );
});
