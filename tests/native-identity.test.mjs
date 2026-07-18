import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Android and iOS use the same production application identifier", async () => {
  const config = JSON.parse(await readFile(new URL("../app.json", import.meta.url), "utf8"));
  const identifier = config.expo.android.package;

  assert.equal(identifier, "com.kapecakes.aleconnectmobile");
  assert.equal(config.expo.ios.bundleIdentifier, identifier);
  assert.doesNotMatch(identifier, /placeholder/i);
});
