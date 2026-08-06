import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("background report sync is globally defined and registered at the platform minimum", async () => {
  const [backgroundSync, queueContext, completionStore, root, packageJson] =
    await Promise.all([
    read("src/services/report-background-sync.ts"),
    read("src/context/report-queue-context.tsx"),
    read("src/services/report-submission-completion-store.ts"),
    read("src/app/_layout.tsx"),
    read("package.json"),
    ]);

  assert.match(backgroundSync, /TaskManager\.defineTask/);
  assert.match(backgroundSync, /minimumInterval:\s*15/);
  assert.match(backgroundSync, /recordReportSubmissionCompletions/);
  assert.match(queueContext, /ensureReportBackgroundSyncRegistered/);
  assert.match(queueContext, /consumeReportSubmissionCompletions/);
  assert.match(completionStore, /takeReportSubmissionCompletions/);
  assert.match(root, /report-background-sync/);
  assert.match(packageJson, /expo-background-task/);
  assert.match(packageJson, /expo-task-manager/);
});
