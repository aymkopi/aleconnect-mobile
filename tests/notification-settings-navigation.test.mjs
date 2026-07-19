import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification settings uses a shared root route so back returns to its caller", async () => {
  const [notifications, profile, rootRoute] = await Promise.all([
    read("src/app/notifications.tsx"),
    read("src/app/(tabs)/profile/index.tsx"),
    read("src/app/notification-settings.tsx"),
  ]);

  assert.match(notifications, /router\.push\("\/notification-settings"\)/);
  assert.match(profile, /router\.push\([^\n]*"\/notification-settings"/);
  assert.match(
    rootRoute,
    /from "\.\/\(tabs\)\/profile\/push-notifications"/,
  );
});
