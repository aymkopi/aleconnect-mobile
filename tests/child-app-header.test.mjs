import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/child-app-header.tsx", import.meta.url), "utf8").catch(() => "");
function mount(background = "#eff2f6") {
  let width = 44;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useState: () => [width, value => { width = value; }] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View" },
    "@/components/panelui/text": { Text: "Text" },
    "@/hooks/use-app-colors": { useAppColors: () => [background] },
  };
  const exports = {};
  new Function("require", "exports", ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => mocks[name] ?? {}, exports);
  assert.equal(typeof exports.ChildAppHeader, "function", "Missing shared child header");
  const backButton = { kind: "back" }, action = { kind: "action" };
  const render = () => exports.ChildAppHeader({ title: "A long child-screen title", backButton, action });
  return { render, backButton, action };
}

test("child header reserves matching edges as the right action grows and shrinks", () => {
  const mounted = mount();
  let tree = mounted.render();
  for (const actionWidth of [44, 88, 116, 44]) {
    tree.props.children[2].props.onLayout({ nativeEvent: { layout: { width: actionWidth } } });
    tree = mounted.render();
    assert.equal(tree.props.children[0].props.style.width, actionWidth);
    assert.equal(tree.props.children[2].props.style.flexShrink, 0);
    assert.equal(tree.props.children[0].props.children, mounted.backButton);
    assert.equal(tree.props.children[2].props.children, mounted.action);
  }
});

test("child header keeps long titles accessible without overlapping either action", () => {
  const tree = mount().render(), title = tree.props.children[1];
  assert.equal(title.props.accessibilityRole, "header");
  assert.equal(title.props.accessibilityLabel, "A long child-screen title");
  assert.equal(title.props.numberOfLines, 1);
  assert.equal(title.props.ellipsizeMode, "tail");
  assert.equal(title.props.style.minWidth, 0);
  assert.equal(title.props.style.textAlign, "center");
  assert.equal(title.props.style.flex, 1);
  assert.ok(tree.props.style.minHeight >= 56);
});

test("child header follows the background token in both themes", () => {
  for (const color of ["#eff2f6", "#00060f"]) assert.equal(mount(color).render().props.style.backgroundColor, color);
});

async function component(path, mocks) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  new Function("require", "exports", ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(id => id === "react/jsx-runtime" ? { jsx, jsxs: jsx } : mocks[id] ?? {}, exports);
  return exports;
}
function find(tree, type) {
  if (!tree || typeof tree !== "object") return undefined;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children].flat()) { const found = find(child, type); if (found) return found; }
}

test("all ReportPage consumers retain close, back, fallback and right actions through the shared header", async () => {
  const calls = [], action = { kind: "settings" };
  let canGoBack = true;
  const { ReportPage } = await component("../src/features/reports/components/report-page.tsx", {
    react: { useState: () => [0, () => {}] },
    "react-native": { View: "View" },
    "expo-router": { useRouter: () => ({ canGoBack: () => canGoBack, back: () => calls.push("back"), replace: path => calls.push(path) }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) },
    "@/hooks/use-app-colors": { useAppColors: () => ["#18202a"] },
    "@/components/child-app-header": { ChildAppHeader: "Header" },
    "@/components/panelui/button": { Button: "Button" },
  });
  let header = find(ReportPage({ title: "Notifications", children: null, headerAction: action }), "Header");
  assert.equal(header.props.title, "Notifications");
  assert.equal(header.props.action, action);
  header.props.backButton.props.onPress();
  canGoBack = false;
  find(ReportPage({ title: "Notifications", children: null }), "Header").props.backButton.props.onPress();
  header = find(ReportPage({ title: "New report", children: null, onBack: () => calls.push("custom"), onClose: () => calls.push("close") }), "Header");
  assert.equal(header.props.backButton.props.accessibilityLabel, "Close report");
  header.props.backButton.props.onPress();
  assert.deepEqual(calls, ["back", "/reports", "close"]);
});
