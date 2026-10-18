import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function handler(path, name, dependencies) {
  const text = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(source) === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, `${name} exists`);
  const code = (ts.isVariableDeclaration(found) ? "const " : "") + found.getText(source) + `; exports.run = ${name};`;
  const compiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("exports", ...Object.keys(dependencies), compiled)(exports, ...Object.values(dependencies));
  return exports.run;
}
const reportPath = "src/features/reports/new-report-screen.tsx";


test("prepared evidence stays local and is never announced as already uploaded", () => {
  const files = handler(reportPath, "uploadFiles", { form: { photoUploads: [
    { id: "ready", uri: "file://ready.webp", size: 123, status: "ready" },
    { id: "busy", uri: "file://original.jpg", size: null, status: "processing" },
    { id: "failed", uri: "file://failed.jpg", size: null, status: "failed", error: "Could not prepare this photo" },
  ] } });
  assert.deepEqual(files.map((file) => file.status), ["idle", "processing", "error"]);
  assert.equal(files[0].id, "ready");
});

test("report FileUpload selection keeps IDs and sends original photos through durable compression", async () => {
  let form = { photos: [], photoUploads: [] };
  const deleted = [], calls = [];
  let finish;
  const preparation = new Promise((resolve) => { finish = resolve; });
  const refs = { mounted: { current: true }, draftGeneration: { current: 3 }, latest: { current: { scopeCurrent: true } } };
  const prepare = handler(reportPath, "preparePhoto", {
    ...refs, reportId: { current: "report-a" }, reportLimits: { evidenceMax: 3 },
    setForm: (change) => { form = change(form); },
    prepareEvidencePhoto: (...args) => { calls.push(args); return preparation; },
    deleteEvidencePhoto: (uri) => deleted.push(uri),
  });
  const change = handler(reportPath, "changePhotos", {
    ...refs, submittingRef: { current: false }, queued: { current: false }, photoGeneration: 3,
    fixtures: false, setPhotoError() {}, form, removePhoto() {}, preparePhoto: prepare,
  });
  change([{ id: "picked-a", uri: "file://original.jpg" }]);
  assert.deepEqual(calls, [["file://original.jpg", "report-a", "picked-a"]]);
  assert.equal(form.photoUploads[0].status, "processing");
  // Removing during preparation must discard the late durable copy.
  form = { photos: [], photoUploads: [] };
  finish({ id: "picked-a", uri: "file://durable.webp", size: 123 });
  await preparation;
  await Promise.resolve();
  assert.deepEqual(deleted, ["file://durable.webp"]);
  assert.deepEqual(form.photoUploads, []);
});

test("late report picker callbacks cannot move photos into a new draft or account", () => {
  const calls = [];
  const draftGeneration = { current: 4 }, latest = { current: { scopeCurrent: true } };
  const change = handler(reportPath, "changePhotos", {
    draftGeneration, latest, mounted: { current: true }, submittingRef: { current: false }, queued: { current: false }, photoGeneration: 3,
    fixtures: false, setPhotoError() {}, form: { photoUploads: [] }, removePhoto() {}, preparePhoto: (...args) => calls.push(args),
  });
  change([{ id: "old", uri: "file://old.jpg" }]);
  draftGeneration.current = 3;
  latest.current.scopeCurrent = false;
  change([{ id: "old", uri: "file://old.jpg" }]);
  assert.deepEqual(calls, []);
});

test("visual report fixtures use real picker selections without writing durable evidence", () => {
  let form = { photos: [], photoUploads: [] };
  const change = handler(reportPath, "changePhotos", {
    fixtures: true, mounted: { current: true }, submittingRef: { current: false }, queued: { current: false },
    draftGeneration: { current: 1 }, photoGeneration: 1, latest: { current: { scopeCurrent: true } },
    setPhotoError() {}, setForm: (update) => { form = update(form); },
    preparePhoto: () => assert.fail("visual fixtures must not write durable evidence"),
  });
  change([{ id: "local", uri: "blob:local-image", size: 100 }]);
  assert.deepEqual(form.photoUploads, [{ id: "local", uri: "blob:local-image", size: 100, status: "ready" }]);
  change([]);
  assert.deepEqual(form.photos, []);
  assert.deepEqual(form.photoUploads, []);
});
