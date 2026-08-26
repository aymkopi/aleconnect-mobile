import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("login is not blocked by push registration and sign-out waits for session clear", async () => {
  const [authSource, contextSource, profileHookSource, profileSource] =
    await Promise.all([
    readFile(new URL("../src/services/auth.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/context/auth-session-context.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/hooks/use-consumer-profile.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/app/(tabs)/profile/index.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.doesNotMatch(authSource, /registerForPushNotificationsAsync/);
  assert.match(contextSource, /authGeneration/);
  assert.match(contextSource, /authToken:\s*token/);
  assert.match(contextSource, /authGeneration\.current \+= 1/);
  assert.match(profileHookSource, /activeUserIdRef/);
  assert.match(profileSource, /shouldRedirectAfterSignOut/);
  assert.match(profileSource, /!shouldRedirectAfterSignOut \|\| session/);
});

test("required consumer password changes use the existing mobile endpoint", async () => {
  const [authSource, signInSource, routeSource] = await Promise.all([
    readFile(new URL("../src/services/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/sign-in.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/app/(tabs)/profile/change-password.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(authSource, /\/api\/mobile\/auth\/change-password/);
  assert.match(signInSource, /login\.user\.mustChangePassword/);
  assert.match(routeSource, /refreshSession\(\{ forceNetwork: true \}\)/);
});

test("dual sign-in keeps account login compatible and sends email credentials through the consumer auth boundary", async () => {
  const [authSource, signInSource] = await Promise.all([
    readFile(new URL("../src/services/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/sign-in.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(authSource, /export async function signInWithEmail/);
  assert.match(authSource, /mode:\s*"email"/);
  assert.match(authSource, /email,\s*password/);
  assert.match(signInSource, /Account number/);
  assert.match(signInSource, /Email/);
  assert.match(signInSource, /EMAIL_SIGN_IN_REQUIRED/);
  assert.match(signInSource, /setSignInMode\("email"\)/);
});

test("identity setup has a mounted skippable route and consumer-account cache is cleared with auth state", async () => {
  const [layoutSource, accountContextSource, setupSource] = await Promise.all([
    readFile(new URL("../src/app/_layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/context/consumer-account-context.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/email-setup.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layoutSource, /ConsumerAccountProvider/);
  assert.match(layoutSource, /name="email-setup"/);
  assert.match(accountContextSource, /setAccountContext\(null\)/);
  assert.match(accountContextSource, /session\?\.user\.id/);
  assert.match(setupSource, /Skip for now/);
  assert.match(setupSource, /Mock verification is not available/);
  assert.match(setupSource, /refreshSession\(\{ forceNetwork: true \}\)/);
});
