import type { Report } from "./data.ts";
import { parseApiInstant } from "../../utils/manila-time.ts";
import type { ComplaintReportSort } from "../../services/reports.ts";

export type BrowseFilters = {
  account: string;
  status: string;
  type: string;
  period: string;
  start: string;
  end: string;
  sort: ComplaintReportSort;
};
export const defaultBrowseFilters: BrowseFilters = {
  account: "all",
  status: "all",
  type: "all",
  period: "all",
  start: "",
  end: "",
  sort: "newest",
};
export function compareFixtureReports(a: Report, b: Report, sort: ComplaintReportSort) {
  if (sort === "status") return (a.status ?? "").localeCompare(b.status ?? "");
  const timestamp = (row: Report) =>
    (parseApiInstant(sort === "updated" ? row.updatedAt ?? row.createdAt : row.createdAt) ??
      parseApiInstant(row.createdAt))?.getTime() ?? 0;
  return (sort === "oldest" ? 1 : -1) *
    (timestamp(a) - timestamp(b) || (sort === "updated" ? a.id.localeCompare(b.id) : 0));
}
export function manilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function validDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
export function validDateRange(start: string, end: string) {
  return validDate(start) && validDate(end) && start <= end;
}
export function fetchedReportDateBounds(rows: readonly { createdAt: string }[], now = new Date()) {
  const end = manilaDateKey(now);
  const dates = rows.flatMap(row => {
    const instant = parseApiInstant(row.createdAt);
    const day = instant ? manilaDateKey(instant) : "";
    return day && day <= end ? [day] : [];
  }).sort();
  return dates.length ? { start: dates[0], end } : null;
}
export function dateRangeWithinBounds(start: string, end: string, bounds: { start: string; end: string } | null) {
  return !!bounds && validDateRange(start, end) && start >= bounds.start && end <= bounds.end;
}
export function reportPickerDate(day: string) {
  return new Date(day + "T00:00:00");
}
export function reportPickerDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
export function calendarDays(month: string): (string | null)[] {
  const first = new Date(month + "-01T00:00:00Z");
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(first.getTime()))
    return [];
  const count = new Date(
    first.getUTCFullYear(),
    first.getUTCMonth() + 1,
    0,
  ).getDate();
  const cells: (string | null)[] = Array((first.getUTCDay() + 6) % 7).fill(
    null,
  );
  for (let day = 1; day <= count; day++)
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function reportBrowseScope(
  principal: string,
  identity: string | undefined,
  revision: number | undefined,
  query: string,
  filters: BrowseFilters,
) {
  return JSON.stringify([principal, identity, revision, query, filters]);
}
export const reportPeriodLabels: Record<string, string> = {
  all: "All dates",
  month: "This month",
  "last-month": "Last month",
  quarter: "Last 3 months",
  year: "This year",
  custom: "Custom range",
};
export function reportPeriodRange(period: string, now = new Date()) {
  const today = manilaDateKey(now);
  const first = new Date(today.slice(0, 7) + "-01T00:00:00Z");
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  );
  if (period === "last-month") {
    last.setUTCDate(0);
    first.setUTCMonth(first.getUTCMonth() - 1);
  } else if (period === "quarter") first.setUTCMonth(first.getUTCMonth() - 2);
  else if (period === "year") {
    first.setUTCMonth(0);
    last.setUTCMonth(11, 31);
  }
  return {
    start: first.toISOString().slice(0, 10),
    end: last.toISOString().slice(0, 10),
  };
}
export function filterBrowseReports(
  rows: readonly Report[],
  filters: BrowseFilters,
  now = new Date(),
) {
  const range =
    filters.period === "custom"
      ? filters
      : reportPeriodRange(filters.period, now);
  return rows.filter((row) => {
    if (filters.account !== "all" && row.serviceAccountId !== filters.account)
      return false;
    if (
      filters.status !== "all" &&
      (row.status ?? "pending") !== filters.status
    )
      return false;
    if (filters.type !== "all" && row.typeId !== filters.type) return false;
    if (filters.period === "all") return true;
    const instant = parseApiInstant(row.createdAt);
    if (!instant) return false;
    const day = manilaDateKey(instant);
    return (
      validDateRange(range.start, range.end) &&
      day >= range.start &&
      day <= range.end
    );
  });
}

export const browseFixtureReports: Report[] = [
  "in_progress",
  "under_review",
  "resolved",
  "verified",
  "dispatched",
  "rejected",
  "closed",
  null,
].map((status, i) => ({
  id: "fixture-browse-" + i,
  ticketNumber: "TK-2026-" + (1042 - i),
  title: i % 2 ? "Voltage fluctuation" : "Primary line",
  typeTitle: i % 2 ? "Voltage fluctuation" : "Primary line",
  typeId: i % 2 ? "voltage" : "primary",
  categoryId: "power",
  categoryTitle: "No light / power",
  createdAt: i < 3 ? "2026-10-09T00:16:00Z" : "2026-09-21T01:00:00Z",
  updatedAt: i === 3 ? "2026-10-10T01:00:00Z" : "2026-10-09T00:16:00Z",
  status: status as Report["status"],
  serviceAccountId: i % 2 ? "fixture-shop" : "fixture-home",
  accountName: i % 2 ? "Shop" : "Home",
  accountNumber: i % 2 ? "10006822" : "10004821",
  displayAddress:
    i % 2 ? "Shop, Brgy. Bitano, Legazpi" : "Home, Brgy. Bigaa, Legazpi",
}));
