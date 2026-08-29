import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report archive uses server filters, opaque cursors, and a virtualized list", async () => {
  const [service, archive] = await Promise.all([
    read("src/services/reports.ts"),
    read("src/app/(tabs)/reports/list.tsx"),
  ]);

  assert.match(service, /fetchComplaintReportPage/);
  assert.match(service, /nextCursor/);
  assert.match(service, /categoryId/);
  assert.match(service, /sort/);
  assert.match(archive, /FlatList/);
  assert.match(archive, /nextCursor/);
  assert.match(archive, /setTimeout/);
});

test("forced default-page refresh loads the stored page as a status-preservation baseline", async () => {
  const service = await read("src/services/reports.ts");

  assert.match(service, /statusPreservationBaseline[\s\S]*readStoredComplaintReportPage\(userId, true\)/);
  assert.match(service, /preserveKnownConsumerReportStatuses\([\s\S]*statusPreservationBaseline/);
  assert.match(service, /isSupportedConsumerStatusModelVersion\([\s\S]*response\.statusModelVersion[\s\S]*\)/);
});
