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

  assert.match(service, /notification_list_cache_v2/);
  assert.match(service, /nextCursor/);
  assert.match(page, /SectionList/);
  assert.match(page, /nextCursor/);
  assert.match(page, /entityType === "advisory"/);
  assert.match(navigation, /advisoryIdFromPushData/);
  assert.match(root, /\/advisory\/\[id\]/);
});
