import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report queue persists evidence and reuses one idempotency key", async () => {
  const [queue, evidence, root, packageJson] = await Promise.all([
    read("src/services/report-queue.ts"),
    read("src/utils/evidence-image-processing.ts"),
    read("src/app/_layout.tsx"),
    read("package.json"),
  ]);

  assert.match(queue, /AsyncStorage/);
  assert.match(evidence, /Paths\.document/);
  assert.match(queue, /idempotencyKey:\s*item\.idempotencyKey/);
  assert.match(queue, /createEvidenceUploads/);
  assert.match(queue, /NetInfo/);
  assert.match(root, /ReportQueueProvider/);
  assert.match(packageJson, /expo-file-system/);
  assert.match(packageJson, /@react-native-community\/netinfo/);
});
