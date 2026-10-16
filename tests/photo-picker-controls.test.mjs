import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function photo(fixture) {
  const jsx = (type, props) => ({ type, props });
  const part = (name, parts) => Object.assign(() => null, Object.fromEntries(parts.map((key) => [key, name + "." + key])));
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useState: (value) => [value, () => {}], useRef: (value) => ({ current: value }) },
    "react-native": { View: "View", Linking: {} },
    "expo-router": { useRouter: () => ({}), useLocalSearchParams: () => ({}) },
    "lucide-react-native": { Camera: "Camera" },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/dialog": { Dialog: part("Dialog", ["Content", "Title", "Description", "Footer"]) },
    "@/components/panelui/avatar": { Avatar: part("Avatar", ["Badge"]) },
    "@/components/panelui/file-upload": { FileUpload: part("FileUpload", ["Trigger"]) },
    "@/features/reports/components/report-page": { ReportPage: "ReportPage" },
    "@/hooks/use-app-colors": { useAppColors: () => ["white"] },
    "@/utils/avatar-image-processing": {}, "@/services/profile": {}, "@/hooks/use-consumer-profile": {},
    "./profile-ui": { useProfileTask: () => () => true, useProfileBackGuard: () => () => {}, ProfileHeading: "Heading", ProfileNotice: "Notice" },
  };
  const source = readFileSync(new URL("../src/features/profile/photo-screen.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function("require", "exports", compiled + "\nexports.renderPhoto = Photo;")((id) => { assert.ok(id in modules, id); return modules[id]; }, exports);
  const tree = exports.renderPhoto({ identity: { fixture, account: { accounts: [{ id: "a", registeredName: "Test Person" }] } }, serviceAccountId: "a" });
  const nodes = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    nodes.push(node);
    walk(node.props?.children);
  }
  walk(tree);
  return { tree, nodes };
}

test("profile picker uses a labelled camera badge inside FileUpload.Trigger in live and preview flows", () => {
  for (const fixture of [false, true]) {
    const { tree, nodes } = photo(fixture);
    assert.equal(tree.props.disabled, false);
    assert.equal(tree.props.multiple, undefined);
    assert.deepEqual(tree.props.image.crop.aspect, [1, 1]);
    const badge = nodes.find((node) => node.type === "Avatar.Badge");
    assert.ok(badge, "camera action must be attached to the avatar");
    assert.equal(badge.props.children.type, "FileUpload.Trigger");
    const button = badge.props.children.props.children;
    assert.equal(button.props.accessibilityLabel, "Change profile photo");
    assert.equal(button.props.children.type, "Camera");
    assert.ok(!nodes.some((node) => ["Change photo", "Choose sample photo"].includes(node.props?.children)));
  }
});

test("Account information camera opens the photo editor for the selected linked account", () => {
  const path = "src/features/profile/details-screen.tsx";
  const source = ts.createSourceFile(path, readFileSync(new URL("../" + path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let press;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "Button") {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      if (attrs.some((attr) => attr.name.getText(source) === "accessibilityLabel" && attr.initializer?.text === "Change profile photo")) {
        press = attrs.find((attr) => attr.name.getText(source) === "onPress")?.initializer?.expression;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(press, "camera badge needs a labelled navigation action");
  const compiled = ts.transpileModule("exports.press = " + press.getText(source), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [], exports = {};
  new Function("exports", "router", "id", compiled)(exports, { push: (path) => calls.push(path) }, "linked/secondary");
  exports.press();
  assert.deepEqual(calls, ["/profile/photo?serviceAccountId=linked%2Fsecondary"]);
});
