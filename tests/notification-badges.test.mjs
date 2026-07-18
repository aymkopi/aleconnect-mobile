import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("parent notification badges use the authenticated unread count", async () => {
  const [hook, complaints, hotlines] = await Promise.all([
    readFile(
      new URL("../src/hooks/use-unread-notification-count.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/app/(tabs)/complaints/index.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/app/(tabs)/hotlines.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(hook, /fetchNotifications\(\)/);
  assert.match(hook, /if \(!session\)/);
  for (const source of [complaints, hotlines]) {
    assert.match(source, /useUnreadNotificationCount\(\)/);
    assert.match(source, /unreadCount > 0/);
  }
});
