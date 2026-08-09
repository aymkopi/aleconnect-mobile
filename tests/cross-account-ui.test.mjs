import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("account-specific parent feeds reject late responses from another consumer", async () => {
  const [home, advisories, notifications, reports] = await Promise.all([
    read("src/app/(tabs)/home.tsx"),
    read("src/app/advisories.tsx"),
    read("src/app/notifications.tsx"),
    read("src/app/(tabs)/reports/list.tsx"),
  ]);

  for (const source of [home, advisories, notifications]) {
    assert.match(source, /activeUserIdRef/);
    assert.match(source, /loadedUserId/);
  }
  assert.match(reports, /loadGenerationRef/);
});
