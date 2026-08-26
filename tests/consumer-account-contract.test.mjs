import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeConsumerIdentity,
  normalizeLinkedAccounts,
} from "../src/features/accounts/contract.ts";

test("linked account responses retain a legacy sole-account fallback", () => {
  assert.deepEqual(normalizeLinkedAccounts({}, { id: "legacy", username: "ALECO-1", name: "Account" }), {
    accounts: [{ id: "legacy", accountNumber: "ALECO-1", registeredName: "Account", isDefault: true }],
    defaultServiceAccountId: "legacy",
    accessRevision: 0,
  });
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

test("email setup preserves one logical idempotency key across confirm retries", async () => {
  const source = await readFile(new URL("../src/app/email-setup.tsx", import.meta.url), "utf8");
  assert.match(source, /useRef<\{ email: string; idempotencyKey: string \}/);
  assert.match(source, /setupAttempt\.current\?\.email !== normalizedEmail/);
  assert.match(source, /idempotencyKey: setupAttempt\.current\.idempotencyKey/);
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

test("mock setup remains disabled until the server capability is explicitly true", async () => {
  const source = await readFile(
    new URL("../src/app/email-setup.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /accountContext\.capabilities\.mockEmailVerification/);
  assert.match(source, /isDisabled=\{!mockVerificationAvailable \|\| isSubmitting\}/);
  assert.match(source, /if \(!mockVerificationAvailable\) return/);
});
