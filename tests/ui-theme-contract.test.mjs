import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Aleconnect exposes GlueStack semantic colors in both themes", async () => {
  const css = await readFile(new URL("../global.css", import.meta.url), "utf8");

  assert.match(css, /@theme static/);
  assert.match(css, /@variant light/);
  assert.match(css, /@variant dark/);

  for (const token of [
    "--color-background",
    "--color-foreground",
    "--color-primary",
    "--color-primary-foreground",
    "--color-muted-foreground",
    "--color-card",
    "--color-border",
    "--color-destructive",
  ]) {
    assert.ok(css.split(token).length >= 4, `${token} must have default, light, and dark values`);
  }
});
