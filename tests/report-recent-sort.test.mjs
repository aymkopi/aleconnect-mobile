import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import * as reportData from "../src/features/reports/data.ts";
import * as reportStatus from "../src/features/reports/status.ts";
import { compareFixtureReports, reportBrowseScope, defaultBrowseFilters } from "../src/features/reports/browse-filter.ts";
import { createPromiseRegistry } from "../src/utils/async-coordination.ts";

async function service(apiRequest) {
  const storage = new Map(), exports = {};
  const source = await readFile(new URL("../src/services/reports.ts", import.meta.url), "utf8");
  new Function("require", "exports", ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText)((id) => ({
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      getAllKeys: async () => [...storage.keys()],
      multiRemove: async (keys) => { keys.forEach((key) => storage.delete(key)); },
    },
    "@/features/reports/data": reportData,
    "@/features/reports/status": reportStatus,
    "@/services/api": { apiRequest },
    "@/utils/async-coordination": { createPromiseRegistry },
    "@/utils/refresh-cooldown": { claimRefresh: () => true },
    "@/utils/report-transport": {},
  })[id] ?? {}, exports);
  return { ...exports, storage };
}
const scope = { userId: "principal", identityUserId: "identity", accessRevision: 7, serviceAccountId: "account-1" };
const report = {
  id: "ticket-a", ticketNumber: "TK-2026-1042", title: "Primary line", status: "verified",
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-10-10T01:00:00Z",
};
const page = { reports: [report], nextCursor: "updated-cursor", statusModelVersion: 1 };

test("recent request sends server sort/cursor under the current account revision", async () => {
  const urls = [], h = await service(async (url) => { urls.push(new URL(url, "https://example.test")); return page; });
  const result = await h.fetchComplaintReportPage({ ...scope, sort: "updated", cursor: "updated-cursor" });
  assert.equal(urls[0].searchParams.get("sort"), "updated");
  assert.equal(urls[0].searchParams.get("cursor"), "updated-cursor");
  assert.equal(urls[0].searchParams.get("serviceAccountId"), "account-1");
  assert.equal(urls[0].searchParams.get("accessRevision"), "7");
  assert.equal(result.reports[0].updatedAt, report.updatedAt);
  assert.equal(result.reports[0].status, "verified");
  assert.equal(result.nextCursor, "updated-cursor");
  assert.equal(h.storage.size, 0);
});

test("recent requests deduplicate only the identical sort, cursor and access scope", async () => {
  const requests = [], h = await service((url) => new Promise((resolve) => requests.push({ url, resolve })));
  const tasks = [
    h.fetchComplaintReportPage({ ...scope, sort: "updated" }),
    h.fetchComplaintReportPage({ ...scope, sort: "updated" }),
    h.fetchComplaintReportPage({ ...scope, sort: "newest" }),
    h.fetchComplaintReportPage({ ...scope, sort: "updated", cursor: "next" }),
    h.fetchComplaintReportPage({ ...scope, sort: "updated", accessRevision: 8 }),
    h.fetchComplaintReportPage({ ...scope, sort: "updated", serviceAccountId: "account-2" }),
  ];
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 5);
  requests.forEach(({ resolve }) => resolve(page));
  await Promise.all(tasks);
});

test("recent order never reuses or overwrites the default newest offline cache", async () => {
  let fail = false;
  const urls = [], h = await service(async (url) => {
    urls.push(url);
    if (fail) throw new Error("offline");
    return page;
  });
  await h.fetchComplaintReportPage(scope);
  const stored = [...h.storage.entries()];
  await h.fetchComplaintReportPage({ ...scope, sort: "updated" });
  assert.deepEqual([...h.storage.entries()], stored);
  await h.fetchComplaintReportPage(scope);
  assert.equal(urls.length, 2);
  fail = true;
  await assert.rejects(() => h.fetchComplaintReportPage({ ...scope, sort: "updated" }), /offline/);
  assert.deepEqual([...h.storage.entries()], stored);
});

test("recent fixture order uses updated dates, stable IDs and legacy fallback", () => {
  const newer = { ...report, id: "ticket-z", createdAt: "2026-10-09T00:00:00Z", updatedAt: null };
  const older = { ...report, id: "ticket-a", updatedAt: "2026-10-11T00:00:00Z" };
  assert.deepEqual([newer, older].sort((a, b) => compareFixtureReports(a, b, "updated")).map((r) => r.id), ["ticket-a", "ticket-z"]);
  assert.equal(compareFixtureReports({ ...report, id: "b" }, { ...report, id: "a" }, "updated") < 0, true);
  assert.ok(compareFixtureReports({ ...newer, updatedAt: "invalid" }, newer, "updated") === 0);
  assert.equal(reportData.normalizeReportListItem({ ...report, updatedAt: undefined }).updatedAt, undefined);
  assert.notEqual(
    reportBrowseScope("principal", "identity", 7, "", defaultBrowseFilters),
    reportBrowseScope("principal", "identity", 7, "", { ...defaultBrowseFilters, sort: "updated" }),
  );
});

test("both sort pickers expose Recently updated and guest sign-in resumes Reports", async () => {
  for (const [name, returnTo] of [["main-screen", "/reports"], ["all-reports-screen", "/reports/list"]]) {
    const source = await readFile(new URL(`../src/features/reports/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, /updated: "Recently updated"/);
    assert.ok(source.includes(`returnTo: "${returnTo}"`));
  }
  const source = await readFile(new URL("../src/features/reports/all-reports-screen.tsx", import.meta.url), "utf8");
  assert.match(source, /params\.sort === "updated"/);
});

for (const denied of [{ status: 401 }, { status: 403, code: 'ACCOUNT_NOT_ACCESSIBLE' }, { status: 409 }, { code: 'STALE_ACCESS_REVISION' }]) test('denied report scope never falls back to former-account cache: '+JSON.stringify(denied), async () => {
  let failure; const h = await service(async () => { if (failure) throw failure; return page; });
  await h.fetchComplaintReportPage(scope);
  const keys = [...h.storage.keys()]; assert.ok(keys.length);
  h.storage.set('other-user', 'preserve');
  failure = Object.assign(new Error('Access denied'), denied);
  await assert.rejects(() => h.fetchComplaintReportPage({ ...scope, force: true }), /Access denied/);
  keys.forEach((key) => assert.equal(h.storage.has(key), false));
  assert.equal(h.storage.get('other-user'), 'preserve');
});
test('network failure retains a labelled stale default report page', async () => {
  let offline = false; const h = await service(async () => { if (offline) throw new Error('offline'); return page; });
  await h.fetchComplaintReportPage(scope); offline = true;
  const result = await h.fetchComplaintReportPage({ ...scope, force: true });
  assert.equal(result.isStale, true); assert.equal(result.reports[0].id, report.id);
});
