import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification settings service caches server-confirmed settings per user", async () => {
  const source = await read("src/services/notification-settings.ts");

  assert.match(source, /@react-native-async-storage\/async-storage/);
  assert.match(source, /notification_settings_cache_v1/);
  assert.match(source, /function cacheKey\(userId: string\)/);
  assert.match(source, /writeCache\(userId, response\)/);
  assert.match(source, /fetchNotificationSettings\(\s*userId: string/s);
  assert.match(source, /saveNotificationSettings\(\s*userId: string/s);
});

test("notification settings fetch falls back to stale cache", async () => {
  const source = await read("src/services/notification-settings.ts");

  assert.match(source, /const cached = await readCache\(userId\)/);
  assert.match(source, /if \(cached\) return \{ \.\.\.cached, isStale: true \}/);
});

test("notification settings save caches only the server response", async () => {
  const source = await read("src/services/notification-settings.ts");

  assert.match(source, /const response = await apiRequest<NotificationSettings>/);
  assert.match(source, /await writeCache\(userId, response\)/);
  assert.doesNotMatch(source, /writeCache\(userId, input\)/);
});
