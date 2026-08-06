import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active advisories have a cached home preview, feed, and detail route", async () => {
  const [service, home, feed, detail, root] = await Promise.all([
    read("src/services/advisories.ts"),
    read("src/app/(tabs)/home.tsx"),
    read("src/app/advisories.tsx"),
    read("src/app/advisory/[id].tsx"),
    read("src/app/_layout.tsx"),
  ]);

  assert.match(service, /\/api\/mobile\/advisories/);
  assert.match(service, /active_advisories_cache_v1/);
  assert.match(service, /nextCursor/);
  assert.match(home, /Active advisories/);
  assert.match(home, /\/advisories/);
  assert.match(feed, /FlatList/);
  assert.match(feed, /nextCursor/);
  assert.match(detail, /Advisory details/);
  assert.match(root, /name="advisories"/);
});
