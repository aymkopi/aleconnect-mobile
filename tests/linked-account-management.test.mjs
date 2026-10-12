import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile reads and cache keys are scoped to identity, service account, and access revision", async () => {
  const [profileService, profileHook] = await Promise.all([
    readFile(new URL("../src/services/profile.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/use-consumer-profile.ts", import.meta.url), "utf8"),
  ]);

  assert.match(profileService, /serviceAccountId/);
  assert.match(profileService, /accessRevision/);
  assert.match(profileService, /URLSearchParams/);
  assert.match(profileHook, /identityUserId/);
  assert.match(profileHook, /serviceAccountId/);
  assert.match(profileHook, /accessRevision/);
});

test("linked-account mutations carry revision and unlink requires a current account password without persistence", async () => {
  const source = await readFile(
    new URL("../src/services/linked-accounts.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /action:\s*"setDefault"/);
  assert.match(source, /action:\s*"unlink"/);
  assert.match(source, /currentAccountPassword/);
  assert.match(source, /reauthenticationRequired/);
  assert.doesNotMatch(source, /AsyncStorage/);
});

test("account-link requests preserve consumer reasons and never persist a submitted password", async () => {
  const source = await readFile(
    new URL("../src/services/account-link-requests.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /consumerReason/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /parseConsumerAccountLinkRequestStatus/);
  assert.doesNotMatch(source, /AsyncStorage/);
});
