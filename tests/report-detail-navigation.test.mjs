import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all ticket callers use the shared root detail route", async () => {
  const [root, layout, notifications, complaints, archive, createReport] =
    await Promise.all([
      read("src/app/_layout.tsx"),
      read("src/app/report/[id].tsx"),
      read("src/app/notifications.tsx"),
      read("src/app/(tabs)/reports/index.tsx"),
      read("src/app/(tabs)/reports/list.tsx"),
      read("src/app/(tabs)/reports/new.tsx"),
    ]);

  assert.match(root, /pathname: "\/report\/\[id\]"/);
  assert.match(layout, /from "\.\.\/\(tabs\)\/reports\/\[id\]"/);
  for (const source of [notifications, complaints, archive, createReport]) {
    assert.match(source, /pathname: "\/report\/\[id\]"/);
    assert.doesNotMatch(source, /pathname: "\/complaints\/\[id\]"/);
  }
});

test("ticket history shows the consumer-facing destination status", async () => {
  const detail = await read("src/app/(tabs)/reports/[id].tsx");

  assert.match(detail, /formatStatus\(item\.toStatus\)/);
  assert.doesNotMatch(detail, /formatStatus\(item\.fromStatus\)/);
});
