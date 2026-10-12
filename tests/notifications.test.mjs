import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("consumer notification service scopes versioned caches by active filters", () => {
  const service = source("src/services/notifications.ts");

  assert.match(service, /MobileNotificationCategory/);
  assert.match(service, /notification_list_cache_v3/);
  assert.match(service, /unread\?: boolean/);
  assert.match(service, /categories\?:/);
  assert.match(service, /params\.set\("unread", "true"\)/);
  assert.match(service, /params\.set\("categories"/);
  assert.match(service, /readCache\(identityUserId, accessRevision, filtersKey/);
  assert.match(service, /serviceAccountId/);
  assert.match(service, /identityLevel/);
});
