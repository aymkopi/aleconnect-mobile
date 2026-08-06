import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeReportSubmissionCompletions,
  takeReportSubmissionCompletions,
} from "../src/services/report-submission-completion-store.ts";

const completion = (id, userId, ticketNumber = `ALC-${id}`) => ({
  id,
  userId,
  ticketId: `ticket-${id}`,
  ticketNumber,
  completedAt: "2026-07-28T00:00:00.000Z",
});

test("background completion restoration is deduplicated and consumer-scoped", () => {
  const stored = mergeReportSubmissionCompletions(
    [completion("1", "consumer-a"), completion("2", "consumer-b")],
    [
      completion("1", "consumer-a", "ALC-UPDATED"),
      completion("3", "consumer-a"),
    ],
  );
  const { matching, remaining } = takeReportSubmissionCompletions(
    stored,
    "consumer-a",
  );

  assert.deepEqual(
    matching.map((item) => item.ticketNumber),
    ["ALC-UPDATED", "ALC-3"],
  );
  assert.deepEqual(remaining, [completion("2", "consumer-b")]);
});

test("background completion storage retains only the latest fifty reports", () => {
  const stored = mergeReportSubmissionCompletions(
    [],
    Array.from({ length: 55 }, (_, index) =>
      completion(String(index), "consumer-a"),
    ),
  );

  assert.equal(stored.length, 50);
  assert.equal(stored[0].id, "5");
  assert.equal(stored.at(-1).id, "54");
});
