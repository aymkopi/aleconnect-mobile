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
