import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("login is not blocked by push registration and sign-out waits for session clear", async () => {
  const [authSource, profileSource] = await Promise.all([
    readFile(new URL("../src/services/auth.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/app/(tabs)/profile/index.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.doesNotMatch(authSource, /registerForPushNotificationsAsync/);
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
