import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("guest users cannot enter the protected complaints stack", async () => {
  const [layout, home] = await Promise.all([
    readFile(
      new URL("../src/app/(tabs)/complaints/_layout.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/app/(tabs)/home.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /useAuthSession\(\)/);
  assert.match(layout, /!session/);
  assert.match(layout, /<Redirect href="\/sign-in"/);
  assert.match(
    home,
    /router\.push\(session \? "\/complaints\/new" : "\/sign-in"\)/,
  );
});
