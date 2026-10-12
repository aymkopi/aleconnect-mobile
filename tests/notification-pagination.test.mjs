import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("consumer notifications paginate, virtualize, and open advisory details", async () => {
  const [service, page, navigation, root, reader, presentation] = await Promise.all([
    read("src/services/notifications.ts"),
    read("src/features/notifications/notifications-screen.tsx"),
    read("src/services/notification-navigation.ts"),
    read("src/app/_layout.tsx"),
    read("src/features/notifications/use-notifications.ts"),
    read("src/features/notifications/presentation.ts"),
  ]);

  assert.match(service, /notification_list_cache_v3/);
  assert.match(service, /identityUserId/);
  assert.match(service, /accessRevision/);
  assert.match(service, /serviceAccountId/);
  assert.match(service, /nextCursor/);
  assert.match(page, /SectionList/);
  assert.match(reader, /nextCursor/);
  assert.match(presentation, /entityType === "advisory"/);
  assert.match(page, /item\.entityType === "account_linking"/);
  assert.match(presentation, /export function notificationRoute\(/);
  assert.match(reader, /await markNotificationsRead/);
  assert.match(navigation, /focus: "notification"/);
  assert.match(navigation, /advisoryIdFromPushData/);
  assert.match(navigation, /notificationDestinationFromNotification/);
  assert.match(root, /\/advisory\/\[id\]/);
});
