import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function renderAccount(guest, retainedStates = [], loading = false) {
  const actions = [], stateChanges = [], effects = [];
  let stateIndex = 0;
  const source = await readFile(new URL("../src/features/profile/account-screen.tsx", import.meta.url), "utf8");
  const jsx = (type, props) => ({ type, props });
  const compound = (name, keys) => Object.assign(props => props.open === false ? null : jsx(name, props), Object.fromEntries(keys.map(k => [k, name + "." + k])));
  const account = { id: "private-account", registeredName: "Private service", address: "Private address", accountNumber: "1234567890", isDefault: true };
  const router = { push: (...args) => actions.push(["router", ...args]), replace: () => {}, setParams: () => {} };
  const modules = {
    "@/components/content-skeleton": { ContentSkeleton: "ContentSkeleton" },
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    "react": { useCallback: fn => fn, useEffect: fn => effects.push(fn), useState: value => [retainedStates[stateIndex++] ?? value, next => stateChanges.push(next)] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", ScrollView: "ScrollView", Pressable: "Pressable", Image: "Image" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    "expo-router": { useRouter: () => router, useLocalSearchParams: () => ({}) },
    "uniwind": { useUniwind: () => ({ theme: "light", hasAdaptiveThemes: true }), Uniwind: { setTheme: () => {} } },
    "lucide-react-native": new Proxy({}, { get: (_, key) => key }),
    "@/hooks/use-main-page-scroll": { useMainPageScroll: () => ({ current: null }) },

    "@/components/main-page-header": { MainPageHeader: "MainPageHeader" },
    "@/components/soft-radial": { SoftRadial: "SoftRadial" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/bottom-sheet": { BottomSheet: compound("BottomSheet", ["Content", "Header", "Body", "Footer"]) },
    "@/components/panelui/dialog": { Dialog: compound("Dialog", ["Content", "Header", "Body", "Footer", "Title", "Description"]) },
    "@/components/panelui/toast": { toast: { show: () => {} } },
    "@/components/panelui/label": { Label: "Label" },
    "@/components/panelui/select": { Select: compound("Select", ["Trigger", "Content", "Item", "Value"]) },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session: guest ? null : { user: { name: "Private person" } }, signOut: async () => {} }) },
    "@/hooks/use-consumer-account": { useConsumerAccount: () => ({ isLoading: loading, accountContext: loading ? null : { defaultServiceAccountId: account.id, accounts: [account] } }) },
    "@/hooks/use-consumer-profile": { useConsumerProfile: () => ({ isLoading: loading, profile: loading ? null : { fullName: "Private person", avatarUrl: "https://private.example/avatar" }, error: loading ? null : { message: "Private profile failure" }, reload: () => {} }) },
    "@/hooks/use-app-colors": { useAppColors: () => ["#66737D"] },
    "@/context/visual-preview-context": { useVisualPreview: () => ({ fixtures: false, setFixtures: () => {} }) },
    "@/context/guest-access-context": { useGuestAccess: () => ({ guest, openFeature: path => actions.push(["feature", path]) }) },
    "@/components/preview-label": { PreviewLabel: "PreviewLabel" },
    "@/components/floating-app-bar": { appScrollableBottomPadding: () => 108 },
  };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: id => { if (!(id in modules)) throw new Error("Unexpected import " + id); return modules[id]; } });
  const root = exports.default();
  const nodes = [];
  function walk(node) {
    if (node == null || typeof node === "boolean") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== "object") { nodes.push(node); return; }
    if (typeof node.type === "function") return walk(node.type(node.props));
    nodes.push(node);
    walk(node.props?.children);
  }
  walk(root);
  const button = (label) => nodes.find(n => typeof n === "object" && n.type === "Pressable" && n.props.accessibilityLabel === label + ", Sign in") ?? nodes.find(n => typeof n === "object" && n.type === "Pressable" && n.props.accessibilityLabel?.startsWith(label));
  const text = nodes.filter(n => typeof n === "string").join(" | ");
  return { nodes, text, button, actions, stateChanges, effects };
}

test("Guest uses the Account layout without exposing retained private identity or linked data", async () => {
  const { text, nodes, button } = await renderAccount(true);
  for (const label of ["Guest", "ALECO accounts", "Account & security", "Preferences", "About & support", "Manage accounts", "Sign in required"]) assert.ok(text.includes(label), label);
  assert.doesNotMatch(text, /Private person|Private service|Private address|1234567890|••7890|Private profile failure|1 linked/);
  assert.equal(nodes.filter(n => typeof n === "object" && n.type === "Image").length, 0);
  for (const label of ["Personal information", "ALECO accounts", "Change password", "Alerts & notifications", "Appearance"]) assert.match(button(label).props.accessibilityLabel, /Sign in$/);
});

test("Guest private Account actions use the shared gate while support stays accessible", async () => {
  const result = await renderAccount(true);
  for (const label of ["Personal information", "ALECO accounts", "Change password", "Alerts & notifications", "Appearance", "Help & support", "Privacy & terms", "About ALEConnect"]) result.button(label).props.onPress();
  result.nodes.find(n => typeof n === "object" && n.type === "Button" && n.props.children === "Manage accounts").props.onPress();
  assert.deepEqual(result.actions, [
    ["feature", "/profile/details"], ["feature", "/profile/accounts"], ["feature", "/profile/change-password"],
    ["feature", "/notification-settings"], ["feature", "/profile?appearance=1"], ["feature", "/profile/help"],
    ["feature", "/profile/privacy"], ["feature", "/profile/about"], ["feature", "/profile/accounts"],
  ]);
  assert.deepEqual(result.stateChanges, []);
});

test("Signed-in Account retains its identity, linked account and local appearance sheet", async () => {
  const result = await renderAccount(false);
  for (const label of ["Private person", "Private service", "Private address", "••7890", "1 linked", "Sign out"]) assert.ok(result.text.includes(label), label);
  assert.doesNotMatch(result.button("Personal information").props.accessibilityLabel, /Sign in/);
  result.button("Appearance").props.onPress();
  assert.deepEqual(result.stateChanges, [true]);
  assert.deepEqual(result.actions, []);
});

test("Session loss immediately hides retained private sheets and resets their state", async () => {
  const result = await renderAccount(true, [true, false, true]);
  assert.doesNotMatch(result.text, /Color theme|Choose Light, Dark|Sign out of ALEConnect/);
  for (const effect of result.effects) effect();
  assert.deepEqual(result.stateChanges, [false, false, false]);
  assert.deepEqual(result.actions, []);
});

test("initial profile and account loads use sized skeletons without a false zero-linked count", async () => {
  const result = await renderAccount(false, [], true);
  const skeletons = result.nodes.filter(n => typeof n === "object" && n.type === "ContentSkeleton");
  assert.deepEqual(skeletons.map(n => n.props.layout), ["identity", "profile"]);
  assert.doesNotMatch(result.text, /0 linked|Not available/);
});
