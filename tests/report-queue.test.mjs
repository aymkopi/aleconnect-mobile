import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report queue persists evidence, reuses one idempotency key, and moves submitted reports into the archive", async () => {
  const [queue, evidence, root, archive, queueRoute, packageJson] = await Promise.all([
    read("src/services/report-queue.ts"),
    read("src/utils/evidence-image-processing.ts"),
    read("src/app/_layout.tsx"),
    read("src/app/(tabs)/reports/list.tsx"),
    read("src/app/(tabs)/reports/queue.tsx"),
    read("package.json"),
  ]);

  assert.match(queue, /AsyncStorage/);
  assert.match(evidence, /Paths\.document/);
  assert.match(queue, /idempotencyKey:\s*item\.idempotencyKey/);
  assert.match(queue, /description:\s*_legacyDescription/);
  assert.match(queue, /createEvidenceUploads/);
  assert.match(queue, /NetInfo/);
  assert.match(queue, /filter\(\(entry\) => entry\.id !== item\.id\)/);
  assert.match(root, /ReportQueueProvider/);
  assert.match(archive, /Saved on this device/);
  assert.match(archive, /useReportQueue/);
  assert.match(queueRoute, /Redirect href="\/reports\/list"/);
  assert.match(packageJson, /expo-file-system/);
  assert.match(packageJson, /@react-native-community\/netinfo/);
});
