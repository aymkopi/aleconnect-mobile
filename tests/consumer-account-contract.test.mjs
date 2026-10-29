import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeConsumerIdentity,
  normalizeLinkedAccounts,
  combineConsumerAccountSnapshots,
} from "../src/features/accounts/contract.ts";

test("linked account responses retain a legacy sole-account fallback", () => {
  assert.deepEqual(normalizeLinkedAccounts({}, { id: "legacy", username: "ALECO-1", name: "Account" }), {
    accounts: [{ id: "legacy", accountNumber: "ALECO-1", registeredName: "Account", isDefault: true }],
    defaultServiceAccountId: "legacy",
    accessRevision: 0,
  });
});

test("explicit empty account reads never synthesize legacy access", () => {
  const principal = { id: "identity", sessionMode: "identity" };
  const identity = normalizeConsumerIdentity({ identityUserId: "identity", sessionMode: "identity", authorizedServiceAccountIds: [], accessRevision: 4 }, principal);
  const linked = normalizeLinkedAccounts({ identityUserId: "identity", accounts: [], accessRevision: 4 }, principal);
  assert.deepEqual(identity.authorizedServiceAccountIds, []);
  assert.equal(identity.defaultServiceAccountId, "");
  assert.deepEqual(linked.accounts, []);
  const combined = combineConsumerAccountSnapshots(identity, linked);
  assert.deepEqual(combined.accounts, []);
  assert.deepEqual(combined.authorizedServiceAccountIds, []);
});

test("only an omitted legacy array permits the sole-account fallback", () => {
  const principal = { id: "identity", sessionMode: "identity" };
  assert.deepEqual(normalizeConsumerIdentity({ sessionMode: "identity" }, principal).authorizedServiceAccountIds, []);
  assert.deepEqual(normalizeConsumerIdentity({}, principal).authorizedServiceAccountIds, []);
  assert.deepEqual(normalizeLinkedAccounts({}, principal).accounts, []);
  assert.deepEqual(normalizeConsumerIdentity({ authorizedServiceAccountIds: null }, { id: "legacy" }).authorizedServiceAccountIds, []);
  assert.deepEqual(normalizeLinkedAccounts({ accounts: null }, { id: "legacy" }).accounts, []);
});

test("consumer identity parsing keeps the legacy account authoritative when additive fields are omitted", () => {
  assert.deepEqual(
    normalizeConsumerIdentity({}, {
      id: "legacy",
      username: "ALECO-1",
      name: "Account",
    }),
    {
      identityUserId: "legacy",
      sessionMode: "legacy",
      authorizedServiceAccountIds: ["legacy"],
      defaultServiceAccountId: "legacy",
      accessRevision: 0,
      capabilities: {
        emailSetup: false,
        accountLinking: false,
        accountNumberLogin: true,
        mockEmailVerification: false,
      },
    },
  );
});

test("consumer identity parsing accepts additive access context without trusting malformed account ids", () => {
  assert.deepEqual(
    normalizeConsumerIdentity(
      {
        identityUserId: "identity-1",
        sessionMode: "identity",
        authorizedServiceAccountIds: ["account-1", "account-2", "account-1", 4],
        defaultServiceAccountId: "account-2",
        accessRevision: 3,
        capabilities: { emailSetup: true, accountLinking: true, accountNumberLogin: false, mockEmailVerification: true },
      },
      { id: "legacy" },
    ),
    {
      identityUserId: "identity-1",
      sessionMode: "identity",
      authorizedServiceAccountIds: ["account-1", "account-2"],
      defaultServiceAccountId: "account-2",
      accessRevision: 3,
      capabilities: {
        emailSetup: true,
        accountLinking: true,
        accountNumberLogin: false,
        mockEmailVerification: true,
      },
    },
  );
});

test("an identity session remains an identity when its session principal is the identity user", () => {
  const parsed = normalizeConsumerIdentity(
    {
      identityUserId: "identity-1",
      sessionMode: "identity",
      authorizedServiceAccountIds: ["account-1"],
      defaultServiceAccountId: "account-1",
    },
    { id: "identity-1" },
  );

  assert.equal(parsed.sessionMode, "identity");
});

test("identity setup stores the replacement token before its caller refreshes session state", async () => {
  const source = await readFile(
    new URL("../src/services/consumer-identity.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /"\/api\/mobile\/consumer-identity"/);
  assert.match(source, /await setAuthToken\(response\.token\)/);
  assert.match(source, /verification:\s*"mock"/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /idempotent: true/);
});

test("email setup dismissal is scoped to the legacy service account rather than globally", async () => {
  const source = await readFile(
    new URL("../src/services/consumer-identity.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /email_setup_dismissed_v1:/);
  assert.match(source, /AsyncStorage\.setItem/);
  assert.match(source, /AsyncStorage\.getItem/);
});

test("consumer account loading does not combine unequal identity and linked-account revisions", async () => {
  const source = await readFile(
    new URL("../src/services/consumer-identity.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /readConsistentConsumerAccountSnapshot/);
  assert.doesNotMatch(source, /Math\.max\(identity\.accessRevision, linkedAccounts\.accessRevision\)/);
});
