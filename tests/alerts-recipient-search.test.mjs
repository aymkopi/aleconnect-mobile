import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
function evaluate(code, modules, fileName = "module.ts") {
  const exports = {};
  new Function("require", "exports", ts.transpileModule(code, { fileName, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)((name) => {
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}
const areas = evaluate(await source("src/features/profile/profile-state.ts"), {});
const settings = {
  preferences: { receivePushNotifications: true, receiveAdvisories: true },
  selectedSubstationIds: [], selectedFeederIds: ["bitano-1", "bitano-2", "ligao-1"],
  substations: ["Bitano", "Ligao"].map((name) => ({ id: name.toLowerCase(), name: `${name} substation`, feeders: [1, 2, 3].map((number) => ({ id: `${name.toLowerCase()}-${number}`, name: `${name} Feeder ${number}` })) })),
  isStale: false,
};
const component = (name, parts = []) => Object.assign(() => null, { displayName: name }, Object.fromEntries(parts.map((part) => [part, `${name}.${part}`])));
const nameOf = (node) => typeof node.type === "string" ? node.type : node.type?.displayName;
const textOf = (node) => Array.isArray(node) ? node.map(textOf).join("") : typeof node === "string" || typeof node === "number" ? String(node) : node?.props ? textOf(node.props.children) : "";
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node?.props) return [];
  return [node, ...nodes(node.props.children)];
}

async function harness({ permission, registered } = {}) {
  const state = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = index === 0 ? structuredClone(settings) : index === 6 && permission ? permission : index === 14 && registered !== undefined ? registered : initial;
        return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
      },
      useRef: (initial) => ({ current: initial }), useEffect() {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { View: "View", AppState: {}, Linking: {} },
    "expo-router": { useRouter: () => ({ canGoBack: () => true, back() {}, replace() {} }) },
    "@react-native-community/netinfo": {}, "expo-notifications": {},
    "lucide-react-native": Object.fromEntries(["Bell", "ChevronLeft", "Check", "Search", "X", "Zap"].map((name) => [name, name])),
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/dialog": { Dialog: component("Dialog", ["Content", "Title", "Description", "Footer"]) },
    "@/components/panelui/bottom-sheet": { BottomSheet: component("BottomSheet", ["Content", "Header", "Body", "Footer"]) },
    "@/components/panelui/checkbox": { Checkbox: "Checkbox" },
    "@/components/panelui/switch": { Switch: "Switch" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/spinner": { Spinner: "Spinner" },
    "@/components/panelui/input-group": { InputGroup: component("InputGroup", ["Prefix", "Input", "Suffix"]) },
    "@/features/reports/components/report-page": { ReportPage: "ReportPage" },
    "@/hooks/use-scoped-read": { useScopedRead: () => ({ data: settings, busy: false, reload: async () => {} }) },
    "@/hooks/use-app-colors": { useAppColors: () => ["#006bb8", "#66737d"] },
    "@/services/notification-settings": {}, "@/services/push-notifications": {},
    "@/constants/panelui-preview": { PANELUI_PREVIEW: true },
    "./profile-ui": { ProfileGate: "ProfileGate", ProfileNotice: "ProfileNotice", useProfileTask: () => () => true, useProfileBackGuard: () => () => {} },
    "./profile-fixtures": { profileFixtureSettings: settings }, "./profile-state": areas,
  };
  const screen = evaluate(await source("src/features/profile/alerts-screen.tsx"), modules, "alerts-screen.tsx");
  const inner = screen.default().props.children({ fixture: true, key: "fixture", principalId: "fixture" });
  let tree;
  const render = () => { cursor = 0; tree = inner.type(inner.props); return nodes(tree); };
  const find = (name, predicate = () => true) => {
    const node = render().find((item) => nameOf(item) === name && predicate(item));
    assert.ok(node, `Missing ${name}`);
    return node;
  };
  return {
    render, find,
    button(label) { find("Button", (node) => textOf(node).trim() === label).props.onPress(); },
    search(query) { find("InputGroup.Input").props.onChangeText(query); },
    get selected() { return areas.expandAreas(state[0].substations, state[0].selectedSubstationIds, state[0].selectedFeederIds); },
  };
}

test("recipient search filters stations and current feeders while keeping hidden selections and full station counts", async () => {
  const h = await harness();
  h.button("Choose areas");
  h.search("  BITANO FEEDER 3  ");
  assert.equal(h.render().filter((node) => nameOf(node) === "Checkbox").length, 1);
  const station = h.find("Checkbox", (node) => node.props.label === "Bitano substation");
  assert.equal(station.props.description, "2 of 3 feeders selected");
  assert.equal(station.props.indeterminate, true);
  assert.ok(h.render().some((node) => textOf(node).includes("1 matching feeders · 3 selected overall")));
  h.button("Choose feeders");
  assert.equal(h.find("InputGroup.Input").props.value, "");
  h.search("Bitano Feeder 3");
  h.find("Checkbox", (node) => node.props.label === "Bitano Feeder 3").props.onCheckedChange(true);
  h.find("Button", (node) => node.props.accessibilityLabel === "Clear area search").props.onPress();
  assert.equal(h.find("Checkbox", (node) => node.props.label === "Bitano Feeder 1").props.checked, true);
  assert.equal(h.find("Checkbox", (node) => node.props.label === "Bitano Feeder 2").props.checked, true);
  assert.ok(h.render().some((node) => textOf(node).includes("4 selected overall")));
  h.search("Feeder 3");
  h.find("Button", (node) => node.props.accessibilityLabel === "Back to broadcast areas").props.onPress();
  assert.equal(h.find("InputGroup.Input").props.value, "");
  assert.equal(h.find("Checkbox", (node) => node.props.label === "Bitano substation").props.checked, true);
  assert.equal(h.find("Checkbox", (node) => node.props.label === "Ligao substation").props.indeterminate, true);
  h.button("Use selected areas");
  assert.deepEqual(h.selected.sort(), ["bitano-1", "bitano-2", "bitano-3", "ligao-1"]);
});

test("bulk search actions affect matching feeders and preserve all hidden selected IDs", async () => {
  const h = await harness();
  h.button("Choose areas");
  h.search("Ligao Feeder 2");
  h.button("Select matches");
  assert.equal(h.find("Checkbox", (node) => node.props.label === "Ligao substation").props.description, "2 of 3 feeders selected");
  assert.ok(h.render().some((node) => textOf(node).includes("4 selected overall")));
  h.button("Clear matches");
  assert.ok(h.render().some((node) => textOf(node).includes("3 selected overall")));
  h.button("Use selected areas");
  assert.deepEqual(h.selected.sort(), ["bitano-1", "bitano-2", "ligao-1"]);
});

test("no-match state retains selection and uses one sheet with 48px labelled search decorators", async () => {
  const h = await harness();
  h.button("Choose areas");
  h.button("Choose feeders");
  h.search("Daraga north");
  assert.equal(h.render().filter((node) => nameOf(node) === "Checkbox").length, 0);
  assert.ok(h.render().some((node) => textOf(node).includes("No matching feeders · 3 selected overall")));
  assert.ok(h.render().some((node) => textOf(node).includes("Try a feeder or substation name. Your existing selections are kept.")));
  assert.equal(h.find("InputGroup.Input").props.style.minHeight, 48);
  assert.equal(h.find("Search").props.size, 18);
  assert.equal(h.find("Button", (node) => node.props.accessibilityLabel === "Clear area search").props.style.width, 48);
  assert.equal(h.render().filter((node) => nameOf(node) === "BottomSheet").length, 1);
  h.find("Button", (node) => node.props.accessibilityLabel === "Clear area search").props.onPress();
  assert.equal(h.find("Checkbox", (node) => node.props.label === "Bitano Feeder 1").props.checked, true);
  h.button("Use selected areas");
  assert.deepEqual(h.selected.sort(), ["bitano-1", "bitano-2", "ligao-1"]);
});

test("device-ready confirmation disappears after notification permission is revoked", async () => {
  for (const permission of ["Allowed", "Blocked", "Not allowed"]) {
    const h = await harness({ permission, registered: true });
    assert.equal(h.render().some(node => textOf(node) === "Visual fixture · device setup simulated"), permission === "Allowed");
  }
});
