import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("advisory storage, requests, pagination, and detail use the identity revision scope", async () => {
  const [service, publicUpdates, home, feed, detail] = await Promise.all([
    read("src/services/advisories.ts"),
    read("src/services/public-updates.ts"),
    read("src/app/(tabs)/home.tsx"),
    read("src/app/advisories.tsx"),
    read("src/app/advisory/[id].tsx"),
  ]);
  for (const source of [service, publicUpdates, home, feed, detail]) {
    assert.match(source, /identityUserId/);
    assert.match(source, /accessRevision/);
  }
  assert.match(service, /active_advisories_cache_v2/);
  assert.match(service, /advisoryScopeKey/);
  assert.match(publicUpdates, /public_updates_cache_v1/);
  assert.match(publicUpdates, /advisoryScopeKey/);
  assert.match(feed, /loadedScopeKey/);
  assert.match(detail, /activeScopeKeyRef/);
  assert.match(detail, /loadedScopeKey/);
});
