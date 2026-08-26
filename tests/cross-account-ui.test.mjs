import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("unified report and notification readers retain identity, revision, and account labels", async () => {
  const [reports, notifications, navigation, screen] = await Promise.all([
    read("src/services/reports.ts"), read("src/services/notifications.ts"), read("src/services/notification-navigation.ts"), read("src/app/notifications.tsx"),
  ]);
  assert.match(reports, /serviceAccountId/);
  assert.match(reports, /accessRevision/);
  assert.match(notifications, /identityLevel/);
  assert.match(notifications, /accountNumber/);
  assert.match(notifications, /serviceAccountId/);
  assert.match(notifications, /accessRevision/);
  assert.match(navigation, /account_linking/);
  assert.match(navigation, /serviceAccountId/);
  assert.match(screen, /All accounts/);
});
