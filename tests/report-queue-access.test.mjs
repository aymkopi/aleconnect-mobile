import assert from "node:assert/strict";
import test from "node:test";

import { evaluateQueuedReportAccess, isQueuedReportVisible } from "../src/services/report-queue-access.ts";

const current = {
  identityUserId: "identity-1",
  authorizedServiceAccountIds: ["account-1", "account-2"],
  accessRevision: 7,
};

test("queued report access accepts only the exact captured identity, account, and revision", () => {
  assert.deepEqual(
    evaluateQueuedReportAccess({
      userId: "identity-1",
      identityUserId: "identity-1",
      serviceAccountId: "account-2",
      accessRevision: 7,
    }, current),
    {
      allowed: true,
      legacyUpgraded: false,
      scope: {
        identityUserId: "identity-1",
        serviceAccountId: "account-2",
        accessRevision: 7,
      },
    },
  );

  assert.deepEqual(
    evaluateQueuedReportAccess({
      userId: "identity-1",
      identityUserId: "identity-1",
      serviceAccountId: "account-2",
      accessRevision: 6,
    }, current),
    { allowed: false, code: "QUEUE_ACCESS_STALE" },
  );
});

test("queued report access rejects removed accounts and safely upgrades only a matching legacy sole account", () => {
  assert.deepEqual(
    evaluateQueuedReportAccess({
      userId: "identity-1",
      identityUserId: "identity-1",
      serviceAccountId: "account-removed",
      accessRevision: 7,
    }, current),
    { allowed: false, code: "ACCOUNT_NOT_ACCESSIBLE" },
  );

  assert.deepEqual(
    evaluateQueuedReportAccess(
      { userId: "account-1" },
      { identityUserId: "identity-1", authorizedServiceAccountIds: ["account-1"], accessRevision: 1 },
    ),
    {
      allowed: true,
      legacyUpgraded: true,
      scope: {
        identityUserId: "identity-1",
        serviceAccountId: "account-1",
        accessRevision: 1,
      },
    },
  );

  assert.deepEqual(
    evaluateQueuedReportAccess(
      { userId: "account-1" },
      { identityUserId: "identity-1", authorizedServiceAccountIds: ["account-1", "account-2"], accessRevision: 2 },
    ),
    { allowed: false, code: "ACCOUNT_NOT_ACCESSIBLE" },
  );
});

test("same-identity removed-account drafts remain visible without exposing another identity's drafts", () => {
  assert.equal(isQueuedReportVisible({
    userId: "identity-1",
    identityUserId: "identity-1",
    serviceAccountId: "account-removed",
    accessRevision: 6,
  }, current), true);
  assert.equal(isQueuedReportVisible({
    userId: "identity-2",
    identityUserId: "identity-2",
    serviceAccountId: "account-removed",
    accessRevision: 6,
  }, current), false);
  assert.equal(isQueuedReportVisible({ userId: "account-1", serviceAccountId: "account-1" }, current), true);
  assert.equal(isQueuedReportVisible({ userId: "account-removed", serviceAccountId: "account-removed" }, current), false);
});
