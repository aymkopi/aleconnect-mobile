import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile returns to the top whenever its tab gains focus", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/profile/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useFocusEffect/);
  assert.match(source, /scrollRef\.current\?\.scrollTo\(\{ y: 0, animated: false \}\)/);
  assert.match(source, /<ScrollView\s+ref=\{scrollRef\}/);
});
