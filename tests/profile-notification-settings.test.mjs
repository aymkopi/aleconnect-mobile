import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notification settings autosave and expose OS permission state", async () => {
  const source = await readFile(
    new URL(
      "../src/app/(tabs)/profile/push-notifications.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /Notifications\.getPermissionsAsync/);
  assert.match(source, /Notifications\.requestPermissionsAsync/);
  assert.match(source, /Linking\.openSettings/);
  assert.match(source, /setTimeout\(\(\) =>/);
  assert.match(source, /saveNotificationSettings\(draftPayload\)/);
  assert.match(source, /Changes save automatically/);
  assert.doesNotMatch(source, /onPress=\{save\}/);
});
