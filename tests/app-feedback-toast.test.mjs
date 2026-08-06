import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("global feedback uses the GlueStack toast host", async () => {
  const source = await readFile(
    new URL("../src/app/_layout.tsx", import.meta.url),
    "utf8",
  );

  for (const symbol of ["ToastDescription", "ToastTitle", "useToast"]) {
    assert.match(source, new RegExp(`\\b${symbol}\\b`));
  }
  assert.equal((source.match(/toast\.show\(\{/g) ?? []).length, 3);
  assert.match(source, /handleForegroundNotification/);
  assert.match(source, /Math\.min\(width - 32,\s*420\)/);
  assert.match(source, /numberOfLines=\{2\}/);
  assert.doesNotMatch(source, /setLogoutMessage|setToast\(/);
});
