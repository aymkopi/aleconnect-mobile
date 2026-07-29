import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("consumer notification service scopes versioned caches by active filters", () => {
  const service = source("src/services/notifications.ts");

  assert.match(service, /MobileNotificationCategory/);
  assert.match(service, /notification_list_cache_v2/);
  assert.match(service, /unread\?: boolean/);
  assert.match(service, /categories\?:/);
  assert.match(service, /params\.set\("unread", "true"\)/);
  assert.match(service, /params\.set\("categories"/);
  assert.match(service, /readCache\(options\.userId, filtersKey/);
});

test("consumer notification screen exposes All, Unread, and approved category controls", () => {
  const screen = source("src/app/notifications.tsx");

  for (const label of [
    "All",
    "Unread",
    "Report updates",
    "Area incidents",
    "Advisories",
    "System",
  ]) {
    assert.match(screen, new RegExp(label));
  }
  assert.match(screen, /selectedCategory/);
  assert.match(screen, /showUnreadOnly/);
  assert.match(screen, /fetchNotifications\(\{[\s\S]*categories:/);
  assert.match(screen, /load\(true\)/);
});
