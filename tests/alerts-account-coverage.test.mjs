import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/profile/alerts-screen.tsx", import.meta.url), "utf8");
const settings = {
  preferences: { receivePushNotifications: true, receiveAdvisories: true },
  coverageMode: "account_locations",
  accountCoverage: [
    { serviceAccountId: "home", barangayPsgc: "rawis", feeders: [{ id: "a", name: "Bitano Feeder 1" }] },
    { serviceAccountId: "family", barangayPsgc: "bigaa", feeders: [] },
  ],
  selectedSubstationIds: [], selectedFeederIds: [], substations: [], isStale: false,
};
const component = (name, parts = []) => Object.assign(() => null, { displayName: name }, Object.fromEntries(parts.map(part => [part, `${name}.${part}`])));
const nameOf = node => typeof node.type === "string" ? node.type : node.type?.displayName;
const textOf = node => Array.isArray(node) ? node.map(textOf).join("") : typeof node === "string" || typeof node === "number" ? String(node) : node?.props ? textOf(node.props.children) : "";
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return node?.props ? [node, ...nodes(node.props.children)] : [];
}
function harness({ permission, registered, value = settings, accountNumber = "10004821" } = {}) {
  const state = [], routes = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = index === 0 ? structuredClone(value) : index === 6 && permission ? permission : index === 10 && registered !== undefined ? registered : initial;
        return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
      },
      useRef: initial => ({ current: initial }), useEffect() {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { View: "View", AppState: {}, Linking: {} },
    "expo-router": { useRouter: () => ({ canGoBack: () => true, back() {}, replace() {}, push: route => routes.push(route) }) },
    "@react-native-community/netinfo": {}, "expo-notifications": {},
    "lucide-react-native": { Bell: "Bell", Zap: "Zap" },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/dialog": { Dialog: component("Dialog", ["Content", "Title", "Description", "Footer"]) },
    "@/components/panelui/switch": { Switch: "Switch" },
    "@/components/panelui/text": { Text: "Text" },
    "@/features/reports/components/report-page": { ReportPage: "ReportPage" },
    "@/hooks/use-scoped-read": { useScopedRead: () => ({ data: value, busy: false, reload: async () => {} }) },
    "@/hooks/use-app-colors": { useAppColors: () => ["#006bb8", "#66737d"] },
    "@/services/notification-settings": {}, "@/services/push-notifications": {},
    "@/constants/panelui-preview": { PANELUI_PREVIEW: true },
    "./profile-ui": { ProfileGate: "ProfileGate", ProfileNotice: "ProfileNotice", useProfileTask: () => () => true, useProfileBackGuard: () => () => {} },
    "./profile-fixtures": { profileFixtureSettings: value },
  };
  const exports = {};
  new Function("require", "exports", ts.transpileModule(source, { fileName: "alerts-screen.tsx", compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => {
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  const inner = exports.default().props.children({ fixture: true, key: "identity:revision", principalId: "fixture", account: { accounts: [
    { id: "home", accountNumber, registeredName: "Sample Home", address: "Rawis, Legazpi City" },
    { id: "family", accountNumber: "10007604", address: "Bigaa, Legazpi City" },
  ] } });
  const render = () => { cursor = 0; return nodes(inner.type(inner.props)); };
  return { render, routes };
}

test("alerts show automatic coverage for every account without manual feeder controls", () => {
  const h = harness();
  const tree = h.render(), copy = tree.map(textOf).join(" ");
  for (const expected of ["10004821", "10007604", "Rawis, Legazpi City", "Bitano Feeder 1", "Feeder coverage is not available", "only advisories addressed to everyone"]) assert.ok(copy.includes(expected), expected);
  assert.ok(!tree.some(node => ["Checkbox", "BottomSheet", "InputGroup.Input"].includes(nameOf(node))));
  assert.ok(!copy.includes("Change areas"));
  tree.find(node => nameOf(node) === "Button" && textOf(node) === "Browse all advisories").props.onPress();
  assert.deepEqual(h.routes, ["/advisories"]);
});

test("both notification switches remain editable", () => {
  const h = harness();
  const switches = h.render().filter(node => nameOf(node) === "Switch");
  assert.deepEqual(switches.map(node => node.props.accessibilityLabel), ["Push notifications", "Power advisories"]);
  for (const item of switches) item.props.onValueChange(false);
  assert.ok(h.render().filter(node => nameOf(node) === "Switch").every(node => node.props.value === false));
});

test("missing account location and older settings payloads have safe coverage copy", () => {
  assert.ok(harness({ accountNumber: null }).render().map(textOf).join(" ").includes("Sample Home"));
  const noLocation = structuredClone(settings);
  noLocation.accountCoverage[0] = { serviceAccountId: "home", barangayPsgc: null, feeders: [] };
  assert.ok(harness({ value: noLocation }).render().map(textOf).join(" ").includes("Select this account’s location"));
  const old = { ...settings, accountCoverage: undefined, selectedFeederIds: ["old-manual-follow"] };
  const copy = harness({ value: old }).render().map(textOf).join(" ");
  assert.ok(copy.includes("Refresh settings to load this account’s coverage"));
  assert.ok(!copy.includes("old-manual-follow"));
});

test("private coverage cache follows the identity access revision", () => {
  assert.match(source, /fetchNotificationSettings\(identity\.key\)/);
  assert.match(source, /saveNotificationSettings\(identity\.key, value\)/);
  assert.doesNotMatch(source, /selectedSubstationIds|selectedFeederIds/);
});

test("device-ready confirmation disappears after notification permission is revoked", () => {
  for (const permission of ["Allowed", "Blocked", "Not allowed"]) {
    const h = harness({ permission, registered: true });
    assert.equal(h.render().some(node => textOf(node) === "Visual fixture; device setup simulated"), permission === "Allowed");
  }
});
