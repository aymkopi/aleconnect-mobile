import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notification responses are consumed before routing", async () => {
  const service = await readFile(
    new URL("../src/services/push-notifications.ts", import.meta.url),
    "utf8",
  );
  const receiver = await readFile(
    new URL("../src/components/push-notifications-receiver.tsx", import.meta.url),
    "utf8",
  );

  assert.match(service, /if \(response\) clearLastNotificationResponse\(\)/);
  assert.match(receiver, /clearLastNotificationResponse\(\);\s*onNotificationResponseReceived/);
  assert.doesNotMatch(receiver, /getLastNotificationResponseAsync/);
});

test("terminated Android notification taps survive process startup", async () => {
  const service = await readFile(
    new URL("../src/services/push-notifications.ts", import.meta.url),
    "utf8",
  );
  const receiver = await readFile(
    new URL("../src/components/push-notifications-receiver.tsx", import.meta.url),
    "utf8",
  );
  const entry = await readFile(new URL("../index.ts", import.meta.url), "utf8");
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(packageJson.main, "./index.ts");
  assert.match(entry, /import "\.\/src\/services\/push-notifications"/);
  assert.match(entry, /import "expo-router\/entry"/);
  assert.match(service, /Notifications\.addNotificationResponseReceivedListener/);
  assert.match(receiver, /subscribeToNotificationResponses/);
  assert.ok(
    receiver.indexOf("subscribeToNotificationResponses(handleNotificationResponse)") <
      receiver.indexOf("void consumeLastNotificationResponseAsync()"),
    "the early response subscription must be installed before persisted startup state is consumed",
  );
  assert.match(service, /TaskManager\.defineTask/);
  assert.match(service, /Notifications\.registerTaskAsync/);
  assert.match(service, /AsyncStorage\.setItem/);
  assert.match(service, /AsyncStorage\.getItem/);
  assert.match(service, /AsyncStorage\.removeItem/);
  assert.match(
    service,
    /const persistedResponse = await consumePersistedNotificationResponseAsync\(\);\s*if \(persistedResponse\)/,
  );
});
