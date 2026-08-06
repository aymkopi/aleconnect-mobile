import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("queued evidence is persistent but excluded from Android and iOS backups", async () => {
  const [app, plugin, evidence] = await Promise.all([
    read("app.json"),
    read("plugins/with-report-evidence-backup-exclusion.js"),
    read("src/utils/evidence-image-processing.ts"),
  ]);

  assert.match(app, /"allowBackup": false/);
  assert.match(app, /with-report-evidence-backup-exclusion/);
  assert.match(plugin, /isExcludedFromBackup = true/);
  assert.match(plugin, /report-evidence/);
  assert.match(plugin, /\.applicationSupportDirectory/);
  assert.match(evidence, /Paths\.document/);
});
