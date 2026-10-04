import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadProcessor(copyResult) {
  const source = await readFile(new URL("../src/utils/evidence-image-processing.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const events = [];
  let copied = false;
  class File {
    constructor(parent, name) { this.uri = name ? `${parent.uri}/${name}` : parent; }
    get exists() { return false; }
    get size() { return this.uri === "compressed.webp" || copied ? 1024 : 0; }
    copy() {
      events.push("copy-start");
      return copyResult().then(() => { copied = true; events.push("copy-finished"); });
    }
  }
  class Directory {
    constructor(...parts) { this.uri = parts.join("/"); }
    create() {}
  }
  const module = { exports: {} };
  const require = (name) => {
    if (name === "expo-file-system") return { File, Directory, Paths: { document: "documents" } };
    if (name === "expo-image-manipulator") return {
      SaveFormat: { WEBP: "webp" }, manipulateAsync: async () => ({ uri: "compressed.webp" }),
    };
    throw new Error(`Unexpected dependency ${name}`);
  };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return { ...module.exports, events };
}

test("prepared evidence stays pending until its asynchronous copy completes", async () => {
  let finishCopy;
  const copy = new Promise((resolve) => { finishCopy = resolve; });
  const processor = await loadProcessor(() => copy);
  let returned = false;
  const preparation = processor.prepareEvidencePhoto("input.jpg", "report-1", "photo-1")
    .then((result) => { returned = true; return result; });
  await new Promise((resolve) => setImmediate(resolve));
  const returnedBeforeCopy = returned;
  finishCopy();
  const result = await preparation;
  assert.equal(returnedBeforeCopy, false, "queue must not see unfinished evidence");
  assert.deepEqual(processor.events, ["copy-start", "copy-finished"]);
  assert.deepEqual(result, { id: "photo-1", uri: "documents/report-evidence/report-1/photo-1.webp", size: 1024 });
});

test("an asynchronous evidence copy failure rejects preparation", async () => {
  const error = new Error("Storage is full");
  const processor = await loadProcessor(async () => { throw error; });
  await assert.rejects(processor.prepareEvidencePhoto("input.jpg", "report-1", "photo-1"), error);
});
