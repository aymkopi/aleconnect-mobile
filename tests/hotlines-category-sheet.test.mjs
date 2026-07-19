import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the category sheet sizes to content, caps at 55%, and remains scrollable", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/hotlines.tsx", import.meta.url),
    "utf8",
  );
  const start = source.indexOf('<BottomSheet ref={categorySheetRef}');
  const end = source.indexOf('<BottomSheet ref={allSheetRef}');
  const categorySheet = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(categorySheet, /enableDynamicSizing/);
  assert.match(categorySheet, /maxDynamicContentSize=\{height \* 0\.55\}/);
  assert.match(categorySheet, /<BottomSheetScrollView/);
  assert.doesNotMatch(categorySheet, /snapPoints|className="h-full"/);
});

test("hotline search prioritizes one result list and category names can wrap", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/hotlines.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /!query && aleco/);
  assert.match(source, /!query && categories\.length/);
  assert.match(source, /numberOfLines=\{3\}/);
});
