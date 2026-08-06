import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  mapWithConcurrency,
  requestPhaseFailureMessage,
} from "../src/utils/report-transport.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("evidence work never exceeds two concurrent uploads and rejects partial failure", async () => {
  let active = 0;
  let peak = 0;
  const result = await mapWithConcurrency([1, 2, 3], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(result, [2, 4, 6]);
  assert.equal(peak, 2);
  await assert.rejects(
    mapWithConcurrency([1, 2], 2, async (value) => {
      if (value === 2) throw new Error("partial upload");
      return value;
    }),
    /partial upload/,
  );
});

test("transport errors use actionable phase messages without leaking account data", () => {
  assert.equal(
    requestPhaseFailureMessage("evidence upload", "timeout"),
    "Upload timed out; your report is still here. Retry upload.",
  );
  assert.equal(
    requestPhaseFailureMessage("final submit", "network"),
    "Final submit could not connect; your report is still here. Retry submission.",
  );
  assert.doesNotMatch(
    requestPhaseFailureMessage("final submit", "network"),
    /100002343800221/,
  );
});

test("submission transport persists diagnostics and retries only the idempotent final call", async () => {
  const [api, reports, queue, list] = await Promise.all([
    read("src/services/api.ts"),
    read("src/services/reports.ts"),
    read("src/services/report-queue.ts"),
    read("src/app/(tabs)/reports/list.tsx"),
  ]);

  assert.match(api, /x-request-id/);
  assert.match(api, /idempotent/);
  assert.match(reports, /phase: "metadata"/);
  assert.match(reports, /"evidence upload"/);
  assert.match(reports, /phase: "final submit"/);
  assert.match(reports, /idempotent: true/);
  assert.match(queue, /mapWithConcurrency\([\s\S]*?,\s*2,/);
  assert.match(queue, /diagnosticId/);
  assert.match(queue, /lastErrorPhase/);
  assert.match(list, /Copy diagnostic code/);
});
