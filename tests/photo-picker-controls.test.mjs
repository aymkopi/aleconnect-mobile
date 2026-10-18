import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { profileEditor, nodes } from "./helpers/profile-editor.mjs";

test("Account information opens the same inline editor for the selected account", async t => {
  const f = await profileEditor(t);
  nodes(f.render()).find(n => n.props?.accessibilityLabel === "Change profile photo").props.onPress();
  assert.equal(f.routes.length, 0);
  const tree = f.render();
  assert.deepEqual(tree.props.sources, ["camera", "library"]);
  const badge = nodes(tree).find(n => n.type === "Avatar.Badge");
  assert.equal(badge.props.children.type, "FileUpload.Trigger");
  assert.equal(badge.props.children.props.children.props.accessibilityLabel, "Change profile photo");
});

test("old photo links redirect to Edit profile while retaining the account scope", async () => {
  const source = await readFile(new URL("../src/features/profile/photo-screen.tsx", import.meta.url), "utf8");
  const exports = {}, jsx = (type, props) => ({ type, props });
  const modules = { "react/jsx-runtime": { jsx }, "expo-router": {
    Redirect: "Redirect", useLocalSearchParams: () => ({ serviceAccountId: "service/b" }),
  } };
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText)(id => modules[id], exports);
  assert.deepEqual(exports.default().props.href, { pathname: "/profile/details", params: { serviceAccountId: "service/b", edit: "1" } });
});
