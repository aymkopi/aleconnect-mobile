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
  assert.doesNotMatch(source, /AsyncStorage/);
});

test("profile account routes offer linked-account management and email-setup guidance", async () => {
  const [profileSource, layoutSource, accountsSource, linkSource] = await Promise.all([
    readFile(new URL("../src/app/(tabs)/profile/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(tabs)/profile/_layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(tabs)/profile/accounts.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(tabs)/profile/link-account.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(profileSource, /ALECO accounts/);
  assert.match(layoutSource, /name="accounts"/);
  assert.match(accountsSource, /Set default/);
  assert.match(accountsSource, /Unlink account/);
  assert.match(linkSource, /Complete email setup first/);
  assert.match(linkSource, /setPassword\(""\)/);
});

test("approval email transition and claim submission never retain a password", async () => {
  const [layout, accounts, signIn, wizard] = await Promise.all([
    readFile(new URL("../src/app/_layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(tabs)/profile/accounts.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/sign-in.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(tabs)/profile/link-account.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /mode: "email"/);
  assert.match(accounts, /pathname: "\/sign-in", params: \{ mode: "email", linked: "1" \}/);
  assert.match(signIn, /requestedMode === "email"/);
  assert.match(wizard, /const submittedPassword = password/);
  assert.match(wizard, /setPassword\(""\); setIsSubmitting/);
});

test("linked-account details keep the unified sign-in email shared and read-only", async () => {
  const detailsSource = await readFile(new URL("../src/app/(tabs)/profile/details.tsx", import.meta.url), "utf8");
  assert.match(detailsSource, /const unifiedIdentity = accountContext\?\.sessionMode === "identity"/);
  assert.match(detailsSource, /description=\{unifiedIdentity \? "Email sign-in" : "Email"\}/);
  assert.match(detailsSource, /button=\{unifiedIdentity \? undefined/);
});
