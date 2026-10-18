import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { useAppReducedMotion } from "../src/hooks/use-app-reduced-motion.ts";

test("full motion applies to component branches and Reanimated's default animations", () => {
  assert.equal(useAppReducedMotion(), false);
  const provider = readFileSync(new URL("../src/components/panelui/panel-ui-provider.tsx", import.meta.url), "utf8");
  assert.match(provider, /<ReducedMotionConfig mode=\{ReduceMotion\.Never\} \/>/);
  assert.ok(provider.indexOf("<ReducedMotionConfig") < provider.indexOf("<KeyboardProvider"));
  const components = new URL("../src/components/panelui/", import.meta.url);
  const files = [new URL("../src/components/floating-app-bar.tsx", import.meta.url), ...readdirSync(components).filter(name => name.endsWith(".tsx")).map(name => new URL(name, components))];
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /\buseReducedMotion\b/, `${file.pathname} must use the app's motion preference`);
  }
});
