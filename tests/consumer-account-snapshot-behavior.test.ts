import assert from "node:assert/strict";
import test from "node:test";

import {
  ConsumerAccountSnapshotMismatchError,
  readConsistentConsumerAccountSnapshot,
  type ConsumerAccessContext,
} from "../src/features/accounts/contract.ts";

const capabilities = {
  emailSetup: true,
  accountLinking: true,
  accountNumberLogin: false,
  mockEmailVerification: false,
};

function identity(accessRevision: number): ConsumerAccessContext {
  return {
    identityUserId: "identity-1",
    sessionMode: "identity",
    authorizedServiceAccountIds: ["account-1"],
    defaultServiceAccountId: "account-1",
    accessRevision,
    capabilities,
  };
}

function linked(accessRevision: number) {
  return {
    identityUserId: "identity-1",
    accounts: [{ id: "account-1", accountNumber: "ALECO-1", registeredName: "Account", isDefault: true }],
    defaultServiceAccountId: "account-1",
    accessRevision,
  };
}

test("snapshot reader rejects equal-revision data from a different identity", async () => {
  await assert.rejects(() => readConsistentConsumerAccountSnapshot({
    readIdentity: async () => identity(5),
    readLinkedAccounts: async () => ({ ...linked(5), identityUserId: "identity-2" }),
  }), ConsumerAccountSnapshotMismatchError);
});

test("snapshot reader rejects equal-revision account-set or default disagreement", async () => {
  await assert.rejects(() => readConsistentConsumerAccountSnapshot({
    readIdentity: async () => ({ ...identity(5), authorizedServiceAccountIds: ["account-1", "account-2"], defaultServiceAccountId: "account-2" }),
    readLinkedAccounts: async () => linked(5),
  }), ConsumerAccountSnapshotMismatchError);
});

test("snapshot reader refetches when identity is older than linked accounts and only returns the equal retry", async () => {
  const identityRevisions = [4, 5];
  const linkedRevisions = [5, 5];
  const result = await readConsistentConsumerAccountSnapshot({
    readIdentity: async () => identity(identityRevisions.shift()!),
    readLinkedAccounts: async () => linked(linkedRevisions.shift()!),
  });

  assert.equal(result.accessRevision, 5);
  assert.equal(result.cacheKey, "identity-1:5");
  assert.deepEqual(result.authorizedServiceAccountIds, ["account-1"]);
  assert.equal(identityRevisions.length, 0);
  assert.equal(linkedRevisions.length, 0);
});

test("snapshot reader refetches when linked accounts are older than identity and only returns the equal retry", async () => {
  const identityRevisions = [5, 5];
  const linkedRevisions = [4, 5];
  const result = await readConsistentConsumerAccountSnapshot({
    readIdentity: async () => identity(identityRevisions.shift()!),
    readLinkedAccounts: async () => linked(linkedRevisions.shift()!),
  });

  assert.equal(result.accessRevision, 5);
  assert.equal(result.defaultServiceAccountId, "account-1");
  assert.equal(identityRevisions.length, 0);
  assert.equal(linkedRevisions.length, 0);
});

test("snapshot reader fails after its bounded refetch instead of publishing a mixed account scope", async () => {
  let identityReads = 0;
  let linkedReads = 0;
  await assert.rejects(
    () => readConsistentConsumerAccountSnapshot({
      readIdentity: async () => {
        identityReads += 1;
        return identity(4);
      },
      readLinkedAccounts: async () => {
        linkedReads += 1;
        return linked(5);
      },
    }),
    ConsumerAccountSnapshotMismatchError,
  );
  assert.equal(identityReads, 2);
  assert.equal(linkedReads, 2);
});

test("snapshot reader preserves the legacy revision-zero sole-account fallback", async () => {
  const result = await readConsistentConsumerAccountSnapshot({
    readIdentity: async () => ({
      ...identity(0),
      identityUserId: "legacy",
      sessionMode: "legacy",
      authorizedServiceAccountIds: ["legacy"],
      defaultServiceAccountId: "legacy",
    }),
    readLinkedAccounts: async () => ({
      accounts: [{ id: "legacy", accountNumber: "ALECO-1", registeredName: "Account", isDefault: true }],
      defaultServiceAccountId: "legacy",
      accessRevision: 0,
    }),
  });

  assert.equal(result.identityUserId, "legacy");
  assert.equal(result.sessionMode, "legacy");
  assert.equal(result.cacheKey, "legacy:0");
});
