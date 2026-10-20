import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { manualRefreshHarness } from "./manual-refresh-harness.mjs";

async function renderAdvisories(feed, query = "", tab = "all") {
  let slot = 0;
  const state = [false, query, tab];
  const calls = [];
  const jsx = (type, props) => ({ type, props });
  const Tabs = Object.assign("Tabs", { List: "Tabs.List", Trigger: "Tabs.Trigger" });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react": { useRef: value => ({ current: value }), useState: () => { const i = slot++; return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value; }]; } },
    "@/context/app-guide-context": { GuideStep: "View" },
    "react-native": { View: "View", FlatList: "FlatList" },
    "expo-router": { useRouter: () => ({ push: path => calls.push(path) }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    "lucide-react-native": { Megaphone: "Megaphone", Search: "Search" },
    "@/context/guest-access-context": { useGuestAccess: () => ({ guest: false }) },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session: { user: { id: "consumer" } } }) },
    "@/hooks/use-consumer-account": { useConsumerAccount: () => ({ accountContext: { identityUserId: "consumer" } }) },
    "@/hooks/use-main-page-scroll": { useMainPageScroll: () => ({ current: null }) },
    "@/components/floating-app-bar": { appScrollableBottomPadding: () => 100 },
    "@/components/main-page-header": { MainPageHeader: "MainPageHeader" },
    "@/components/search-field": { SearchField: "SearchField" },
    "@/components/preview-label": { PreviewLabel: "PreviewLabel" },
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/radio-group": { RadioGroup: Object.assign("RadioGroup", { Item: "RadioItem" }) },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/tabs": { Tabs },
    "./publisher-card": { PublisherCard: "PublisherCard" },
    "./presentation": { matchesUpdate: item => !query || item.title.includes(query), updateRoute: item => item.id },
    "./use-update-feed": { useUpdateFeed: () => feed },
  };
  modules["@/hooks/use-manual-refresh"] = manualRefreshHarness(modules.react);
  const exports = {};
  const source = await readFile(new URL("../src/features/advisories/advisories-screen.tsx", import.meta.url), "utf8");
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(id => { assert.ok(id in modules, "Unmocked " + id); return modules[id]; }, exports);
  const tree = exports.default();
  const find = (node, type) => { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(n => find(n, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)]; };
  const list = find(tree, "FlatList")[0];
  return { states: find(list.props.ListHeaderComponent, "DataState"), notices: [...find(list.props.ListHeaderComponent, "DataNotice"), ...find(list.props.ListFooterComponent, "DataNotice")], list, state, calls, find };
}
const base = { items: [], fixtures: false, authLoading: false, busy: false, data: null, error: null, errorSource: null, reload: async () => {}, loadMore: async () => {} };

test("shared search blur accepts native and web focused-input APIs", async () => {
  const source = await readFile(new URL("../src/components/panelui/search-bar.tsx", import.meta.url), "utf8");
  const expression = source.match(/const holder = (.+);/)[1];
  const readHolder = State => new Function("TextInput", "return " + expression)({ State });
  const input = {};
  assert.equal(readHolder({ currentlyFocusedInput: () => input }), input);
  assert.equal(readHolder({ currentlyFocusedField: () => input }), input);
  assert.equal(readHolder({ currentlyFocusedInput: () => null, currentlyFocusedField: () => null }), null);
});

test("first-load failure offers retry and never reports an empty feed", async () => {
  let retries = 0;
  const view = await renderAdvisories({ ...base, error: "Offline", errorSource: "load", reload: async force => { assert.equal(force, true); retries++; } });
  assert.equal(view.states.length, 1);
  assert.equal(view.states[0].props.title, "ALECO updates couldn’t load");
  assert.equal(view.states[0].props.actionLabel, "Try again");
  view.states[0].props.onAction();
  assert.equal(retries, 1);
  assert.equal(view.notices.length, 0);
});

test("loading is indeterminate and clearing an empty search preserves its tab", async () => {
  const loading = await renderAdvisories({ ...base, busy: true });
  assert.equal(loading.states[0].props.loading, true);
  const filtered = await renderAdvisories({ ...base, data: { items: [], nextCursor: null } }, "Rawis", "advisories");
  assert.equal(filtered.states[0].props.title, "No matching updates");
  assert.equal(filtered.states[0].props.onAction, undefined);
  const header = filtered.list.props.ListHeaderComponent;
  assert.equal(filtered.find(header, "SearchField")[0].props.isClearable, false);
  const clear = filtered.find(header, "Button").filter(node => node.props.children === "Clear search");
  assert.equal(clear.length, 1);
  clear[0].props.onPress();
  assert.deepEqual(filtered.state, [false, "", "advisories"]);
});

test("refresh failure keeps loaded publisher cards and offers a refresh action", async () => {
  let refreshes = 0;
  const items = [{ id: "one", title: "Notice" }, { id: "two", title: "Story" }];
  const view = await renderAdvisories({ ...base, items, data: { items }, error: "Offline", errorSource: "load", reload: async () => { refreshes++; } });
  assert.equal(view.states.length, 0);
  assert.equal(view.find(view.list.props.ListHeaderComponent, "PublisherCard")[0].props.item.id, "one");
  assert.equal(view.list.props.data[0].id, "two");
  assert.equal(view.notices[0].props.title, "Could not refresh updates");
  view.notices[0].props.onAction();
  assert.equal(refreshes, 1);
});

test("pagination failure stays at the footer and retries pagination without a pull-to-refresh spinner", async () => {
  let pages = 0;
  const items = [{ id: "one", title: "Notice" }];
  const view = await renderAdvisories({ ...base, items, data: { items, nextCursor: "next" }, error: "Offline", errorSource: "more", busy: true, loadingMore: true, loadMore: async () => { pages++; } });
  assert.equal(view.list.props.refreshing, false);
  assert.equal(view.notices.length, 1);
  assert.equal(view.notices[0].props.title, "Earlier updates couldn’t load");
  view.find(view.list.props.ListFooterComponent, "Button")[0].props.onPress();
  assert.equal(pages, 1);
  assert.equal(view.list.props.ListHeaderComponent.props.children.filter(Boolean).some(n => n.type === "DataNotice"), false);
});


async function reportRecovery({ session = { user: { id: "user" }, session: { id: "session" } }, account = { identityUserId: "user", accessRevision: 1, authorizedServiceAccountIds: ["linked"] }, data = null, serviceAccountId = "linked", receipt = false, markRead = async () => {} } = {}) {
  const calls = [], effects = [], layouts = [], stateWrites = [];
  const jsx = (type, props) => ({ type, props });
  const presentation = {};
  const source = await readFile(new URL("../src/features/reports/detail-presentation.ts", import.meta.url), "utf8");
  const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "exports", transpile(source))(() => ({}), presentation);
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react": { useCallback: fn => fn, useEffect: fn => effects.push(fn), useLayoutEffect: fn => layouts.push(fn), useRef: value => ({ current: value }), useState: value => [value, next => stateWrites.push(next)] },
    "react-native": { BackHandler: {}, Modal: "Modal", Pressable: "Pressable", View: "View" },
    "expo-image": { Image: "Image" }, "expo-clipboard": {},
    "expo-router": { useRouter: () => ({ push: path => calls.push(["push", path]), replace: path => calls.push(["replace", path]), dismissTo: path => calls.push(["dismissTo", path]), canGoBack: () => false }), useLocalSearchParams: () => ({ id: "report", serviceAccountId }), useFocusEffect: () => {} },
    "lucide-react-native": {},
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    "@/components/panelui/badge": { Badge: "Badge" },
    "@/components/panelui/radio-group": { RadioGroup: Object.assign("RadioGroup", { Item: "RadioItem" }) },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/spinner": { Spinner: "Spinner" },
    "@/components/panelui/skeleton": { Skeleton: "Skeleton" },
    "@/components/panelui/toast": { toast: { show() {} } },
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/floating-app-bar": { appScrollableBottomPadding: () => 100 },
    "@/context/consumer-account-context": { useConsumerAccountContext: () => ({ accountContext: account, isLoading: false, refreshConsumerAccount: async () => calls.push(["refresh-account"]) }) },
    "@/context/visual-preview-context": { useVisualPreview: () => ({ fixtures: false }) },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session, isLoading: false }) },
    "@/hooks/use-app-colors": { useAppColors: () => [] },
    "@/hooks/use-scoped-read": { useScopedRead: scope => ({ data, busy: false, error: null, reload: async force => { assert.ok(scope, "Retry cannot request an inaccessible report"); calls.push(["reload", force]); } }) },
    "@/services/report-sync-events": { requestReportRevalidation: id => calls.push(["invalidate",id]) },
    "@/services/reports": { clearReportListCache: async id => calls.push(["clear",id]) }, "@/services/notifications": { markNotificationsRead: markRead }, "@/utils/manila-time": {},
    "./report-status-badge": { ReportStatusBadge: "ReportStatusBadge" },
    "./components/report-page": { ReportPage: "ReportPage" },
    "./components/evidence-photo-viewer": {},
    "./data": { formatReportDate: () => "Oct 12", consumerTicketStatusLabel: () => "Verified" }, "./detail-fixtures": {}, "./detail-presentation": presentation,
    "./extended-outage-status-card": {}, "./report-timeline": {},
    "@/features/maps/static-location-map": {},
    "expo-router/react-navigation": { useIsFocused: () => true },
  };
  modules["@/hooks/use-manual-refresh"] = manualRefreshHarness(modules.react);
  const exports = {};
  const screen = await readFile(new URL("../src/features/reports/report-detail-screen.tsx", import.meta.url), "utf8");
  new Function("require", "exports", transpile(screen))(id => { assert.ok(id in modules, "Unmocked " + id); return modules[id]; }, exports);
  const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node && typeof node === "object" ? node.type === "DataState" ? node : find(node.props?.children) : null;
  const tree = exports.default();
  if (receipt) return { calls, effects, layouts, stateWrites, tree };
  const state = find(tree);
  assert.equal(state?.type, "DataState");
  state.props.onAction();
  return { props: state.props, calls };
}

test("report recovery leaves unavailable accounts and retries only requests with valid access", async () => {
  const local = await reportRecovery({ serviceAccountId: "removed" });
  assert.equal(local.props.actionLabel, "Back to reports");
  assert.deepEqual(local.calls, [["dismissTo", "/reports"]]);
  const server = await reportRecovery({ data: { unavailableReason: "Access removed" } });
  assert.deepEqual(server.calls, [["dismissTo", "/reports"]]);
  const connection = await reportRecovery();
  assert.equal(connection.props.actionLabel, "Try again");
  assert.deepEqual(connection.calls, [["reload", true]]);
  const account = await reportRecovery({ account: null });
  assert.deepEqual(account.calls, [["refresh-account"]]);
  const guest = await reportRecovery({ session: null, account: null });
  assert.deepEqual(guest.calls, [["push", "/sign-in"]]);
});


async function notificationRecovery(preview, type = "Badge") {
  let slot = 0;
  const jsx = (type, props) => ({ type, props });
  const access = { key: "fixture", fixtures: true, account: { accounts: [], authorizedServiceAccountIds: [] } };
  const feed = { rows: [{ id: "one" }], unreadCount: 5, data: { nextCursor: null }, busy: false, mutation: {}, reload: async () => {} };
  const BottomSheet = Object.assign("BottomSheet", { Content: "Content", Header: "Header", Body: "Body", Footer: "Footer" });
  const InputGroup = Object.assign("InputGroup", { Prefix: "Prefix", Suffix: "Suffix", Input: "Input" });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react": { useState: value => [slot++ === 6 ? preview : value, () => {}], useRef: () => ({ current: null }) },
    "react-native": { SectionList: "SectionList", View: "View" },
    "expo-router": { useRouter: () => ({ push: () => {} }) },
    "lucide-react-native": {},
    "@/components/panelui/badge": { Badge: "Badge" }, "@/components/panelui/bottom-sheet": { BottomSheet },
    "@/components/panelui/radio-group": { RadioGroup: Object.assign("RadioGroup", { Item: "RadioItem" }) },
    "@/components/panelui/button": { Button: "Button" }, "@/components/panelui/input-group": { InputGroup },
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    "@/components/panelui/text": { Text: "Text" },
    "@/features/reports/components/report-page": { ReportPage: "ReportPage" },
    "@/hooks/use-app-colors": { useAppColors: () => [] },
    "./fixtures": { notificationFixtureNow: new Date() },
    "./presentation": { groupNotifications: () => [], matchesNotification: () => true, notificationCategories: [] },
    "./notification-ui": { NotificationGate: "NotificationGate", NotificationNotice: "NotificationNotice" },
    "./use-notifications": { useNotificationAccess: () => access, useNotifications: () => feed },
  };
  modules["@/hooks/use-manual-refresh"] = manualRefreshHarness(modules.react);
  const exports = {};
  const source = await readFile(new URL("../src/features/notifications/notifications-screen.tsx", import.meta.url), "utf8");
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(id => { assert.ok(id in modules, "Unmocked " + id); return modules[id]; }, exports);
  const child = exports.default().props.children;
  const tree = child.type(child.props);
  const find = node => Array.isArray(node) ? node.flatMap(find) : node && typeof node === "object" ? [...(node.type === type ? [node] : []), ...find(node.props?.children)] : [];
  return find(tree);
}

test("unread count badges are hidden until inbox data is available", async () => {
  assert.equal((await notificationRecovery("error")).length, 0);
  assert.equal((await notificationRecovery("loading")).length, 0);
  assert.equal((await notificationRecovery("empty")).length, 0);
  assert.equal((await notificationRecovery("loaded"))[0].props.children, 5);
  assert.equal((await notificationRecovery("offline"))[0].props.children, 5);
});

test("notification tabs announce one selection and keep their text color unchanged", async () => {
  const tabs = (await notificationRecovery("loaded", "Button")).filter(node => node.props.role === "tab");
  assert.deepEqual(tabs.map(node => node.props["aria-selected"]), [true, false]);
  for (const tab of tabs) assert.equal(tab.props.children.props.children[0].props.className, "text-foreground");
});

test("successful unread receipt clears the canonical cache even after immediate Back", async () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const report = { id: "report", status: "verified", unreadNotificationIds: ["update"], serviceAccountId: "linked", imageUrls: [], latitude: null, longitude: null, publicUpdates: [], consumerUpdates: [], history: [] };
  const view = await reportRecovery({ receipt: true, data: { report, isStale: false },
    session: { user: { id: "account-number-principal" }, session: { id: "session" } },
    account: { identityUserId: "canonical", accessRevision: 1, defaultServiceAccountId: "linked", authorizedServiceAccountIds: ["linked"] },
    markRead: async (ids, principal, scope) => { assert.deepEqual(ids,["update"]); assert.equal(principal,"account-number-principal"); assert.equal(scope.identityUserId,"canonical"); await pending; }
  });
  const cleanup = view.layouts.map(fn => fn());
  view.effects.forEach(fn => fn());
  cleanup.filter(fn => typeof fn === "function").forEach(fn => fn());
  complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(view.calls, [["clear","canonical"],["invalidate","account-number-principal"]]);
});

test("failed unread receipt keeps list metadata and exposes the retry explanation", async () => {
  const report = { id: "report", status: "verified", unreadNotificationIds: ["update"], serviceAccountId: "linked", imageUrls: [], latitude: null, longitude: null, publicUpdates: [], consumerUpdates: [], history: [] };
  const view = await reportRecovery({ receipt: true, data: { report, isStale: false }, markRead: async () => { throw new Error("Offline"); } });
  view.layouts.forEach(fn => fn()); view.effects.forEach(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(view.calls,[]);
  assert.deepEqual(view.stateWrites,[false,true]);
});

test("advisory background refresh never activates pull spinner and manual pulls finalize", async () => {
  const background = await renderAdvisories({ ...base, busy: true, data: { items: [] } });
  assert.equal(background.list.props.refreshing,false);
  await background.list.props.onRefresh();
  assert.equal(background.state[0],false);
  const view = await renderAdvisories({ ...base, data: { items: [] } });
  assert.equal(view.list.props.refreshing,false);
  const done = view.list.props.onRefresh();
  assert.ok(view.state[0]);
  await done;
  assert.equal(view.state[0],null);
});
