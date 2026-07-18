import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("guest users are sent to sign-in before opening notifications", async () => {
  const [notifications, hotlines] = await Promise.all([
    readFile(new URL("../src/app/notifications.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/app/(tabs)/hotlines.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(notifications, /<Redirect href="\/sign-in"/);
  assert.match(
    hotlines,
    /router\.push\(session \? "\/notifications" : "\/sign-in"\)/,
  );
});
