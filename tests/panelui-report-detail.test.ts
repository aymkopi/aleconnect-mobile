import test from "node:test";
import assert from "node:assert/strict";
import {
  reportDetailScope,
  reportTimelineRows,
  reportRejectionReason,
  reportAccessUnavailable,
  publishedRestorationEstimate,
} from "../src/features/reports/detail-presentation.ts";
import {
  clampEvidenceIndex,
  isViewableEvidenceUri,
} from "../src/features/reports/components/evidence-photo-state.ts";

const report = {
  status: "in_progress" as const,
  createdAt: "2026-10-07T00:00:00Z",
  history: [],
};

test("missing history shows only the confirmed current status without inventing its timestamp", () => {
  const rows = reportTimelineRows(report);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "in_progress");
  assert.equal(rows[0].changedAt, null);
  assert.equal(rows[0].current, true);
  assert.doesNotMatch(rows[0].note!, /crew|arrival|ETA/i);
});

test("real history remains in server order and missing current history has no guessed date", () => {
  const rows = reportTimelineRows({
    ...report,
    history: [
      {
        id: "review",
        fromStatus: null,
        toStatus: "under_review",
        changedAt: "2026-10-07T00:00:00Z",
        note: null,
      },
      {
        id: "verified",
        fromStatus: "under_review",
        toStatus: "verified",
        changedAt: "invalid",
        note: "Concern checked.",
      },
    ],
  });
  assert.deepEqual(
    rows.map((r) => r.status),
    ["under_review", "verified", "in_progress"],
  );
  assert.equal(rows[0].changedAt, "2026-10-07T00:00:00Z");
  assert.equal(rows[1].changedAt, null);
  assert.equal(rows[2].changedAt, null);
  assert.equal(rows.filter((r) => r.current).length, 1);
});

test("unknown status and rejection use actual available information", () => {
  assert.equal(reportTimelineRows({ ...report, status: null })[0].status, null);
  assert.equal(reportRejectionReason({ history: [] }), null);
  assert.equal(
    reportRejectionReason({
      history: [
        {
          id: "old",
          fromStatus: null,
          toStatus: "rejected",
          changedAt: "",
          note: "First reason",
        },
        {
          id: "new",
          fromStatus: null,
          toStatus: "rejected",
          changedAt: "",
          note: "Account does not match.",
        },
      ],
    }),
    "Account does not match.",
  );
});

test("detail scope changes with login, identity, report, account and access revision", () => {
  const input = {
    principalId: "login-a",
    sessionId: "session-a",
    identityId: "identity-a",
    reportId: "report-a",
    serviceAccountId: "service-a",
    accessRevision: 2,
    authorizedServiceAccountIds: ["service-a", "service-b"],
  };
  const scope = reportDetailScope(input);
  assert.ok(scope);
  for (const field of [
    "principalId",
    "sessionId",
    "identityId",
    "reportId",
    "serviceAccountId",
    "accessRevision",
  ] as const) {
    assert.notEqual(
      reportDetailScope({
        ...input,
        [field]:
          field === "accessRevision"
            ? 3
            : field === "serviceAccountId"
              ? "service-b"
              : "different",
      }),
      scope,
    );
  }
  assert.equal(reportDetailScope({ ...input, principalId: null }), null);
  assert.equal(reportDetailScope({ ...input, identityId: null }), null);
  assert.equal(
    reportDetailScope({ ...input, serviceAccountId: "removed" }),
    null,
  );
});

test("revoked access or removed reports clear the private detail while transient errors can retain it", () => {
  for (const status of [401, 403, 404, 410])
    assert.equal(reportAccessUnavailable({ status }), true);
  for (const error of [
    new Error("Offline"),
    { status: 500 },
    { status: 429 },
    null,
  ])
    assert.equal(reportAccessUnavailable(error), false);
});

test("restoration estimates require a complete valid published window or an actual reason", () => {
  const update = {
    estimateStartAt: null,
    estimateEndAt: null,
    estimateUnavailableReason: null,
  };
  assert.equal(
    publishedRestorationEstimate(update),
    "Restoration time has not been confirmed.",
  );
  assert.equal(
    publishedRestorationEstimate({
      ...update,
      estimateUnavailableReason: "Awaiting field assessment.",
    }),
    "Awaiting field assessment.",
  );
  assert.equal(
    publishedRestorationEstimate({
      ...update,
      estimateStartAt: "2026-10-07T00:00:00Z",
    }),
    "Restoration time has not been confirmed.",
  );
  assert.equal(
    publishedRestorationEstimate({
      ...update,
      estimateStartAt: "2026-10-07T00:00:00Z",
      estimateEndAt: "invalid",
    }),
    "Restoration time has not been confirmed.",
  );
  assert.match(
    publishedRestorationEstimate({
      ...update,
      estimateStartAt: "2026-10-07T00:00:00Z",
      estimateEndAt: "2026-10-07T02:00:00Z",
    }),
    / to /,
  );
});

test("evidence indices and URIs cannot expose storage object keys or an invalid photo", () => {
  assert.equal(clampEvidenceIndex(-1, 3), 0);
  assert.equal(clampEvidenceIndex(8, 3), 2);
  assert.equal(clampEvidenceIndex(NaN, 3), 0);
  assert.equal(clampEvidenceIndex(0, 0), 0);
  for (const uri of [
    "https://evidence.example/signed.webp",
    "file:///photo.webp",
    "content://photo/1",
    "blob:https://preview/photo",
  ])
    assert.equal(isViewableEvidenceUri(uri), true);
  for (const uri of [
    "",
    "ticket-evidence/private/object.webp",
    "javascript:alert(1)",
    "https://",
  ])
    assert.equal(isViewableEvidenceUri(uri), false);
});
