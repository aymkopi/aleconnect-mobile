import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile details uses the shared responsive child UI", async () => {
  const [details, appBar, bottomSheet, button, css] = await Promise.all([
    readFile(new URL("../src/app/(tabs)/profile/details.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/child-app-bar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/bottomsheet/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/button/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../global.css", import.meta.url), "utf8"),
  ]);

  assert.match(details, /<ChildAppBar/);
  assert.doesNotMatch(details, /containerHeight=/);
  assert.match(details, /keyboardBehavior="interactive"/);
  assert.match(details, /enableDynamicSizing/);
  assert.match(details, /<BottomSheetScrollView/);
  assert.match(appBar, /rightActions\?: ReactNode/);
  assert.match(bottomSheet, /android_keyboardInputMode = ["']adjustPan["']/);
  assert.match(bottomSheet, /keyboardBehavior = ["']interactive["']/);
  assert.match(bottomSheet, /setCurrentIndex\(-1\)/);
  assert.match(bottomSheet, /keyboardShouldPersistTaps=\{keyboardShouldPersistTaps\}/);
  assert.match(bottomSheet, /Math\.max\(\s*insets\.bottom,\s*20,/);
  assert.match(bottomSheet, /min-h-11 min-w-11/);
  assert.match(bottomSheet, /pb-safe-or-5/);
  assert.match(button, /icon: 'min-h-9 min-w-9 rounded-full'/);
  const radiusValues = [...css.matchAll(/--radius-(?:sm|md|lg|xl): ([\d.]+rem)/g)]
    .map((match) => match[1]);
  assert.equal(radiusValues.length, 4);
  assert.equal(new Set(radiusValues).size, 1);
});
