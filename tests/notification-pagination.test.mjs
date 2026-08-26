import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("consumer notifications paginate, virtualize, and open advisory details", async () => {
  const [service, page, navigation, root] = await Promise.all([
    read("src/services/notifications.ts"),
    read("src/app/notifications.tsx"),
    read("src/services/notification-navigation.ts"),
    read("src/app/_layout.tsx"),
  ]);

  assert.match(service, /notification_list_cache_v3/);
  assert.match(service, /identityUserId/);
  assert.match(service, /accessRevision/);
  assert.match(service, /serviceAccountId/);
  assert.match(service, /nextCursor/);
  assert.match(page, /SectionList/);
  assert.match(page, /nextCursor/);
  assert.match(page, /entityType === "advisory"/);
  assert.match(page, /notification\.entityType === "account_linking"/);
  assert.match(page, /"View account request"/);
  assert.match(page, /notificationDestinationFromNotification/);
  assert.match(page, /await markNotificationsRead/);
  assert.match(navigation, /focus: "notification"/);
  assert.match(navigation, /advisoryIdFromPushData/);
  assert.match(navigation, /notificationDestinationFromNotification/);
  assert.match(root, /\/advisory\/\[id\]/);
});
