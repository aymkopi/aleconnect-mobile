import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active advisories have a compact shared card, feed, home preview, and detail route", async () => {
  const [service, home, feed, detail, root, card] = await Promise.all([
    read("src/services/advisories.ts"),
    read("src/app/(tabs)/home.tsx"),
    read("src/app/advisories.tsx"),
    read("src/app/advisory/[id].tsx"),
    read("src/app/_layout.tsx"),
    read("src/features/advisories/advisory-list-item.tsx"),
  ]);

  assert.match(service, /\/api\/mobile\/advisories/);
  assert.match(service, /active_advisories_cache_v2/);
  assert.match(service, /nextCursor/);
  assert.match(service, /readonly audience\?: string \| null;/);

  assert.match(home, /Active advisories/);
  assert.match(home, /AdvisoryListItem/);
  assert.match(home, /\/advisories/);
  assert.match(home, /pathname:\s*"\/advisory\/\[id\]"/);

  assert.match(feed, /FlatList/);
  assert.match(feed, /nextCursor/);
  assert.match(feed, /AdvisoryListItem/);
  assert.match(feed, /pathname:\s*"\/advisory\/\[id\]"/);
  assert.doesNotMatch(feed, /<ListSection>/);

  assert.match(card, /Pressable/);
  assert.match(card, /ChevronRight/);
  assert.match(card, /formatManilaAdvisoryInterruptionRange/);
  assert.match(card, /formatManilaReportListDateTime/);
  assert.match(card, /advisory\.controlNumber/);
  assert.match(card, /advisory\.type/);
  assert.match(card, /advisory\.severity/);
  assert.match(card, /advisory\.audience/);
  assert.match(card, /numberOfLines=\{1\}/);
  assert.match(card, /Restored at/);
  assert.match(card, /Until/);

  assert.doesNotMatch(card, /Megaphone/);
  assert.doesNotMatch(card, /ListSectionItem/);
  assert.doesNotMatch(card, /advisory\.title/);
  assert.doesNotMatch(card, /advisory\.content/);

  assert.match(detail, /Advisory details/);
  assert.match(detail, /RESTORED AT|Restored at/);
  assert.match(detail, /scheduledEndAt/);
  assert.match(root, /name="advisories"/);
});

test("mobile advisory readers keep nullable legacy dates and normalize older cached records", async () => {
  const service = await read("src/services/advisories.ts");
  assert.match(service, /scheduledStartAt: string \| null/);
  assert.match(service, /scheduledEndAt: string \| null/);
  assert.match(service, /normalize.*Advisory|normaliz/);
  assert.match(service, /scheduledStartAt.*null|scheduledEndAt.*null/);
  assert.doesNotMatch(service, /scheduledStartAt: string;/);
  assert.doesNotMatch(service, /scheduledEndAt: string;/);
});
