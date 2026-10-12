import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../src/services/reports.ts", import.meta.url);

test("report status sync patches cached rows without refreshing cache age", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /export async function projectComplaintReportStatus/);
  assert.match(source, /export function markComplaintReportsForRevalidation/);
  assert.match(source, /export function complaintReportsNeedRevalidation/);
  assert.match(source, /revalidate\?: boolean/);
  assert.match(source, /report\.id !== projection\.ticketId/);
  assert.match(source, /status: projection\.status/);
  assert.match(source, /fetchedAt: parsed\.fetchedAt/);
  assert.match(source, /value: patched\.page/);
});

test("event revalidation bypasses normal cache freshness but keeps request deduplication", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /const revalidate = Boolean\(options\?\.revalidate\)/);
  assert.match(source, /!revalidate/);
  assert.match(source, /complaintReportRequests\.run\(requestKey/);
  assert.match(
    source,
    /Boolean\(options\?\.force\)\s*&&\s*claimRefresh\(`/,
  );
  assert.doesNotMatch(source, /revalidate[^;\n]*claimRefresh/);
});

test("successful authoritative default-page refresh clears the stale marker", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /complaintReportRevalidationUsers\.delete\(userId\)/);
  assert.match(
    source,
    /complaintReportRevalidationUsers\.has\(userId\)[\s\S]*isStale: true/,
  );
});

test("receipt invalidation clears every cache scope for its owner and retains other owners", async () => {
  const source = await readFile(sourceUrl,"utf8");
  const block = source.slice(source.indexOf("export async function clearReportListCache("), source.indexOf("export async function fetchComplaintMeta("));
  const keys = new Set(["report_list_cache_v1:owner:1:all","report_list_cache_v1:owner:1:linked","report_list_cache_v1:other:1:all"]);
  const storage = { getAllKeys: async () => [...keys], multiRemove: async values => values.forEach(value => keys.delete(value)) };
  const factory = new Function("AsyncStorage","initial","exports",
    "let complaintReportsCacheGeneration=0,complaintReportsMemoryCache=initial;const complaintReportRevalidationUsers=new Set(),complaintReportRequests={clear(){}},complaintReportStorageKey=id=>'report_list_cache_v1:'+id;" +
    ts.transpileModule(block,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText +
    ";return {clear:exports.clearReportListCache,cache:()=>complaintReportsMemoryCache};");
  const own = factory(storage,{userId:"owner:1:all"},{});
  await own.clear("owner");
  assert.equal(own.cache(),null);
  assert.deepEqual([...keys],["report_list_cache_v1:other:1:all"]);
  const other = factory(storage,{userId:"other:1:all"},{});
  await other.clear("owner");
  assert.equal(other.cache().userId,"other:1:all");
});
