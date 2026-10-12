import { defaultBrowseFilters, filterBrowseReports } from "./browse-filter.ts";
import type { Report } from "./data.ts";
export type ReportTab = "all" | "open" | "resolved";
const openStatuses = new Set([
  "under_review",
  "verified",
  "dispatched",
  "in_progress",
]);
export function filterReportTab(rows: readonly Report[], tab: ReportTab) {
  return rows.filter(
    (row) =>
      tab === "all" ||
      (tab === "open"
        ? openStatuses.has(row.status ?? "")
        : row.status === "resolved"),
  );
}
export function getReportTabCounts(rows: readonly Report[]) {
  return {
    all: rows.length,
    open: filterReportTab(rows, "open").length,
    resolved: filterReportTab(rows, "resolved").length,
  };
}
export function filterReportPeriod(
  rows: readonly Report[],
  period: string,
  now = new Date(),
  start = "",
  end = "",
) {
  return filterBrowseReports(
    rows,
    { ...defaultBrowseFilters, period, start, end },
    now,
  );
}
