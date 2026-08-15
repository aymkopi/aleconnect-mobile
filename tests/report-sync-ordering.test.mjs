import assert from "node:assert/strict";
import test from "node:test";

import { isIncomingReportStatusEventNewer } from "../src/services/report-sync-ordering.ts";

const marker = (changedAt, revision) =>
  revision === undefined ? { changedAt } : { changedAt, revision };

test("status event ordering rejects duplicate and older delivery", () => {
  assert.equal(
    isIncomingReportStatusEventNewer(
      null,
      marker("2026-08-15T03:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z", 4),
      marker("2026-08-15T03:01:00.000Z", 5),
    ),
    true,
  );
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z", 5),
      marker("2026-08-15T03:02:00.000Z", 4),
    ),
    false,
  );
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z"),
      marker("2026-08-15T03:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    isIncomingReportStatusEventNewer(
      marker("2026-08-15T03:00:00.000Z", 5),
      marker("2026-08-15T03:01:00.000Z"),
    ),
    true,
  );
});
