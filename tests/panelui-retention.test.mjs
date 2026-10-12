import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import ts from "typescript";
const source = await readFile(
  new URL("../src/features/preview-retention.ts", import.meta.url),
  "utf8",
);
function fixture({ preview = true, physical = false, stored = [] } = {}) {
  const storage = new Map(stored),
    files = new Map(),
    writes = [];
  class Directory {
    constructor(...parts) {
      this.uri = parts.join("/");
    }
    create() {}
  }
  class File {
    constructor(parent, name) {
      this.uri =
        (typeof parent === "string" ? parent : parent.uri) +
        (name ? "/" + name : "");
    }
    create() {
      files.set(this.uri, new Uint8Array());
    }
    write(value) {
      files.set(
        this.uri,
        typeof value === "string" ? Buffer.from(value) : value,
      );
      writes.push(this.uri);
    }
    delete() {
      files.delete(this.uri);
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return files.get(this.uri)?.length || 0;
    }
    get md5() {
      return createHash("md5").update(files.get(this.uri)).digest("hex");
    }
  }
  const mocks = {
      "@react-native-async-storage/async-storage": {
        default: {
          multiGet: async (keys) =>
            keys.map((k) => [k, storage.get(k) || null]),
          multiSet: async (pairs) => {
            pairs.forEach(([k, v]) => storage.set(k, v));
          },
        },
      },
      "expo-device": { isDevice: physical },
      "expo-file-system": {
        File,
        Directory,
        Paths: { document: "private://document", cache: "private://cache" },
      },
      "@/constants/panelui-preview": { PANELUI_PREVIEW: preview },
    },
    exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: false,
      },
    }).outputText,
  )((id) => mocks[id], exports);
  return { exports, storage, files, writes };
}
test("retention seeding is emulator-preview only and preserves any existing data", async () => {
  for (const options of [
    { preview: false },
    { physical: true },
    { stored: [["report_submission_queue_v1", '[{"real":"data"}]']] },
  ]) {
    const f = fixture(options),
      before = [...f.storage];
    await assert.rejects(f.exports.seedEmulatorRetentionFixture());
    assert.deepEqual([...f.storage], before);
    assert.equal(f.writes.length, 0);
  }
});
test("retention snapshot covers nonempty queue, pending receipt and evidence bytes", async () => {
  const f = fixture(),
    before = await f.exports.seedEmulatorRetentionFixture();
  assert.equal(JSON.parse(before).queueCount, 1);
  assert.equal(JSON.parse(before).evidence[0].exists, true);
  assert.ok(f.storage.has("report_submission_completions_v1"));
  assert.equal(await f.exports.readEmulatorRetentionSnapshot(), before);
  const photo = [...f.files.keys()][0];
  f.files.set(photo, Buffer.from("changed"));
  assert.notEqual(await f.exports.readEmulatorRetentionSnapshot(), before);
});
