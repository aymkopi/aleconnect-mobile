import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { getFocusedRouteNameFromRoute } from "./focused-route-harness.mjs";
import { manualRefreshHarness } from "./manual-refresh-harness.mjs";
import { getHomeLayout } from "../src/features/home/home-layout.ts";
import * as reportBrowseFilter from "../src/features/reports/browse-filter.ts";
import * as selection from "../src/features/accounts/selection.ts";
import * as authState from "../src/features/auth/auth-state.ts";
import * as reportStatuses from "../src/features/reports/status.ts";
import { nativeSelectSupportsOptions } from "../src/components/panelui/native-select-contract.ts";
import * as dateHelpers from "../src/lib/date.ts";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function hooks() {
  const slots = [],
    effects = [];
  let cursor = 0;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return {
    react: {
      createContext: () => ({ Provider: "Provider" }),
      createElement: (type, props) => ({ type, props }),
      useRef(value) {
        const i = cursor++;
        return slots[i] ?? (slots[i] = { current: value });
      },
      useState(value) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = value;
        return [
          slots[i],
          (next) => {
            slots[i] = typeof next === "function" ? next(slots[i]) : next;
          },
        ];
      },
      useCallback(fn, deps) {
        const i = cursor++;
        if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn };
        return slots[i].fn;
      },
      useMemo(fn, deps) {
        const i = cursor++;
        if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() };
        return slots[i].value;
      },
      useEffect(fn, deps) {
        const i = cursor++;
        if (!same(slots[i]?.deps, deps))
          effects.push(() => {
            slots[i]?.cleanup?.();
            slots[i] = { deps, cleanup: fn() };
          });
      },
    },
    start() {
      cursor = 0;
    },
    flush() {
      while (effects.length) effects.shift()();
    },
  };
}
async function load(file, mocks) {
  const exports = {};
  const manualRefresh = manualRefreshHarness(mocks.react);
  const source = await readFile(new URL("../" + file, import.meta.url), "utf8");
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )((id) => {
    if (id === "@/hooks/use-manual-refresh") return manualRefresh;
    if (id === "@/context/guest-access-context") return { useGuestAccess: () => ({ guest: false, openFeature: () => {}, requestSignIn: () => {} }) };
    if (id === "@/context/visual-preview-context" && mocks[id]) return { ...mocks[id], useVisualPreview: () => { const value = mocks[id].useVisualPreview(); return { publicFixtures: value.fixtures, ...value }; } };
    if (id === "@/components/panelui/radio-group") return { RadioGroup: Object.assign("RadioGroup", { Item: "RadioItem" }) };
    if (id === "@/components/panelui/theme-selector") return { ThemeSelector: "ThemeSelector" };
    if (id === "@/components/panelui/calendar") return { Calendar: "Calendar" };
    if (id === "@/lib/cn") return { cn: (...classes) => classes.filter(Boolean).join(" ") };
    if (id === "@/lib/date") return dateHelpers;
    if (id === "@/components/panelui/kpi") return { Kpi: Object.assign(() => null, { Group: "KpiGroup", Stat: "KpiStat", Value: "Text", Title: "Text" }) };
    if (id === "expo-router/react-navigation") return { getFocusedRouteNameFromRoute, useIsFocused: () => true, ...mocks[id] };
    if (id === "expo-router")
      return { useLocalSearchParams: () => ({}), useFocusEffect: () => {}, ...mocks[id] };
    if (id === "@/features/main-fixtures")
      return { fixtureReportAccounts: [], ...mocks[id] };
    return (
      mocks[id] ??
      {
        "@/hooks/use-main-page-scroll": { useMainPageScroll: () => ({ current: null }) },
        "@/services/report-sync-events": { subscribeReportRevalidationRequested: () => () => {}, subscribeReportStatusChanged: () => () => {} },
        "./browse-filter": reportBrowseFilter,
        "./home-layout": { getHomeLayout },
        "./status": reportStatuses,
        "@/features/accounts/selection": selection,
        "./auth-state": authState,
      }[id] ??
      {}
    );
  }, exports);
  return exports;
}
test("consumer snapshots are hidden synchronously on principal switch, late completion and logout", async () => {
  const h = hooks(),
    requests = [];
  let session = { user: { id: "A" } };
  const module = await load("src/context/consumer-account-context.tsx", {
    react: h.react,
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session, isLoading: false }),
    },
    "@/services/consumer-identity": {
      fetchConsumerAccountContext: (user) =>
        new Promise((resolve) => requests.push({ id: user.id, resolve })),
    },
  });
  function render() {
    h.start();
    return module.ConsumerAccountProvider({}).props.value;
  }
  render();
  h.flush();
  requests[0].resolve({
    identityUserId: "canonical-A",
    authorizedServiceAccountIds: ["service"],
    defaultServiceAccountId: "service",
    accessRevision: "r1",
    accounts: [{ id: "service", registeredName: "Private A" }],
  });
  await tick();
  assert.equal(render().accountContext.accounts[0].registeredName, "Private A");
  const late = render().refreshConsumerAccount();
  session = { user: { id: "B" } };
  assert.equal(
    render().accountContext,
    null,
    "A must disappear before B's effect runs",
  );
  h.flush();
  requests[1].resolve({
    identityUserId: "canonical-A",
    authorizedServiceAccountIds: ["service"],
    defaultServiceAccountId: "service",
    accessRevision: "r1",
    accounts: [{ id: "service", registeredName: "Late A" }],
  });
  await late;
  await tick();
  assert.equal(render().accountContext, null);
  requests[2].resolve({
    identityUserId: "canonical-B",
    authorizedServiceAccountIds: ["service"],
    defaultServiceAccountId: "service",
    accessRevision: "r1",
    accounts: [{ id: "service", registeredName: "Private B" }],
  });
  await tick();
  assert.equal(render().accountContext.accounts[0].registeredName, "Private B");
  session = null;
  assert.equal(render().accountContext, null);
  h.flush();
  assert.equal(render().accountContext, null);
});
const jsx = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
};
test("sign-in redirects authenticated users and preserves mandatory password setup", async () => {
  const h = hooks();
  let session = { user: { id: "A", mustChangePassword: false } },
    isLoading = false;
  const Redirect = "Redirect";
  const module = await load("src/features/auth/sign-in-screen.tsx", {
    "react-native-keyboard-controller": {
      KeyboardAwareScrollView: "KeyboardAwareScrollView",
    },
    "@/features/profile/profile-ui": { useProfileBackGuard: () => () => {} },
    "@/components/panelui/label": {
      Label: Object.assign(() => null, { Text: "LabelText" }),
    },
    react: h.react,
    "react/jsx-runtime": jsx,
    "react-native": {
      ScrollView: "ScrollView",
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      View: "View",
      Pressable: "Pressable",
    },
    "expo-router": { Redirect, useRouter: () => ({}) },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
    },
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session, isLoading }),
    },
    "@/hooks/use-app-colors": { useAppColors: () => ["gray"] },
    "@/hooks/use-theme": { useTheme: () => ({ theme: "light" }) },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ setFixtures() {} }),
    },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/input-group": {
      InputGroup: Object.assign(() => null, {
        Prefix: "Prefix",
        Input: "Input",
        Suffix: "Suffix",
      }),
    },
  });
  function render() {
    h.start();
    const outer = module.default();
    return outer.type(outer.props);
  }
  let result = render();
  assert.equal(result.type, Redirect);
  assert.equal(result.props.href, "/home");
  session = { user: { id: "A", mustChangePassword: true } };
  result = render();
  assert.deepEqual(result.props.href, {
    pathname: "/required-password",
    params: { returnTo: "/home" },
  });
  session = null;
  assert.ok(
    render().props.children.some(
      (child) => child?.type === "KeyboardAwareScrollView",
    ),
  );
  isLoading = true;
  assert.ok(
    !render().props.children?.some?.(
      (child) => child?.type === "KeyboardAwareScrollView",
    ),
    "restoring session must not expose sign-in",
  );
});
test("Home keeps normal phone layouts fixed and reveals at most three shortcut rows", async () => {
  const h = hooks();
  let isStale = false, readError = null;
  let items = [], fontScale = 1, height = 874, insets = { top: 24, bottom: 24 };
  const module = await load("src/features/home/home-screen.tsx", {
    "uniwind": { useUniwind: () => ({ theme: "light" }) },
    "@/components/panelui/bottom-sheet": {
      BottomSheet: Object.assign(() => null, {
        Content: "Content",
        Header: "Header",
        Body: "Body",
        Footer: "Footer",
      }),
    },
    react: h.react,
    "react/jsx-runtime": jsx,
    "react-native": {
      View: "View",
      ScrollView: "ScrollView",
      ImageBackground: "ImageBackground",
      Pressable: "Pressable",
      useWindowDimensions: () => ({ height, width: 411, fontScale }),
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => insets,
    },
    "expo-router": { useRouter: () => ({}) },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session: null }) },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({ accountContext: null }),
    },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures: false }),
    },
    "@/hooks/use-scoped-read": { useScopedRead: () => ({ data: { items, isStale }, error: readError }) },
    "@/components/panelui/carousel": {
      Carousel: Object.assign(() => null, {
        Content: "CarouselContent",
        Item: "CarouselItem",
        Dots: "CarouselDots",
      }),
    },
    "@/hooks/use-app-colors": { useAppColors: () => [] },
    "@/components/floating-app-bar": { appScrollableBottomPadding: () => 64 + Math.max(insets.bottom, 8) + 24 },
  });
  function scroll() {
    h.start();
    return module.default().props.children;
  }
  assert.equal(scroll().props.scrollEnabled, false, "Normal phones keep Home fixed");
  assert.ok(nodes(scroll()).some(n => n.props?.children === "Quick Actions"));
  for (const device of [{ height: 740, rows: 2, scroll: true }, { height: 874, rows: 2, scroll: false }, { height: 932, rows: 2, scroll: false }, { height: 1200, rows: 3, scroll: false }]) {
    height = device.height; insets = { top: 62, bottom: 34 };
    const tiles = nodes(scroll()).filter(n => n.type === "Pressable" && n.props.style?.width === "25%");
    assert.equal(tiles.length, device.rows * 4);
    assert.equal(tiles.at(-1).props.accessibilityLabel, "Explore services");
    assert.ok(tiles[0].props.style.height >= 80, "48px icon tiles and labels retain their space");
    assert.equal(scroll().props.scrollEnabled, device.scroll);
    const iconTiles = nodes(scroll()).filter(n => n.type === "View" && n.props.style?.width === 48 && n.props.style?.height === 48);
    assert.equal(iconTiles.length, device.rows * 4);
    const header = nodes(scroll()).find(n => n.type === "ImageBackground");
    assert.ok(Math.abs(header.props.style.height - height / 3) < 0.001);
    assert.equal(header.props.style.borderBottomLeftRadius, 28);
    assert.equal(header.props.style.borderBottomRightRadius, 28);
  }
  height = 820; insets = { top: 24, bottom: 24 };
  items = [
    { kind: "advisory", id: "a" },
    { kind: "facebook_post", id: "b" },
  ];
  const content = () =>
    nodes(scroll()).find(n => n.type === "CarouselContent");
  assert.equal(content().props.style.height, 112, "every slide follows the compact advisory reference height");
  fontScale = 1.5;
  assert.equal(content().props.style.height, 112, "carousel retains its fixed advisory height");
  isStale = true;
  assert.ok(nodes(scroll()).some(n => n.props?.children === "Saved"));
  readError = new Error("Offline");
  assert.ok(nodes(scroll()).some(n => n.props?.children === "Refresh failed"));
  assert.ok(nodes(scroll()).some(n => n.props?.accessibilityLabel === "Retry loading ALECO updates"));
  assert.equal(content().props.style.height, 112, "offline notices use the heading rather than consuming card space");
  items = [{ kind: "advisory", id: "c" }];
  assert.equal(content().props.style.height, 112, "removing cards preserves the shared height");
});

test("Reports fixtures render without unsupported Hermes Array.toSorted", async () => {
  const h = hooks();
  const parts = Object.assign(() => null, {
    Trigger: "Trigger",
    Value: "Value",
    Content: "Content",
    Item: "Item",
    ItemText: "ItemText",
    List: "List",
    Header: "Header",
    Body: "Body",
    Footer: "Footer",
  });
  const fixture = [
    {
      title: "Line issue",
      ticketNumber: "TK-1",
      displayAddress: "Rawis",
      categoryId: "power",
      categoryTitle: "Power",
      status: "received",
      createdAt: "2026-10-09T01:00:00Z",
    },
  ];
  const module = await load("src/features/reports/main-screen.tsx", {
    react: h.react,
    "react/jsx-runtime": jsx,
    "react-native": { View: "View", FlatList: "FlatList" },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 24, bottom: 24 }),
    },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session: null }) },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({ accountContext: null }),
    },
    "@/hooks/use-app-colors": { useAppColors: () => ["blue", "white"] },
    "@/hooks/use-scoped-read": {
      useScopedRead: () => ({ data: null, busy: false }),
    },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures: true }),
    },
    "@/features/main-fixtures": { fixtureReports: fixture },
    "expo-router": { useRouter: () => ({ push() {} }) },
    "./main-filter": {
      filterReportPeriod: (x) => x,
      filterReportTab: (x) => x,
      getReportTabCounts: () => ({ all: 1, open: 1, resolved: 0 }),
    },
    "@/components/floating-app-bar": { appScrollableBottomPadding: () => 112 },
    "@/components/panelui/select": { Select: parts },
    "@/components/panelui/tabs": { Tabs: parts },
    "@/components/panelui/bottom-sheet": { BottomSheet: parts },
  });
  const sorted = Array.prototype.toSorted;
  try {
    Array.prototype.toSorted = undefined;
    h.start();
    assert.doesNotThrow(() => module.default());
  } finally {
    Array.prototype.toSorted = sorted;
  }
});

function nodes(root) {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== "object") return [];
  return [
    root,
    ...Object.values(root.props ?? {}).flatMap((value) =>
      Array.isArray(value) ? value.flatMap(nodes) : nodes(value),
    ),
  ];
}
const sheetParts = Object.assign(() => null, {
  Content: "SheetContent",
  Header: "SheetHeader",
  Body: "SheetBody",
  Footer: "SheetFooter",
});
const selectParts = Object.assign(() => null, { Item: "SelectItem" });
function sheetMocks(h) {
  return {
    "expo-router": { useRouter: () => ({ push() {} }) },
    react: h.react,
    "react/jsx-runtime": jsx,
    "react-native": {
      View: "View",
      FlatList: "FlatList",
      ScrollView: "ScrollView",
      Pressable: "Pressable",
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 24, bottom: 24 }),
    },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session: null }) },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({ accountContext: null }),
    },
    "@/hooks/use-app-colors": { useAppColors: () => ["blue", "white"] },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures: true }),
    },
    "@/components/floating-app-bar": { appScrollableBottomPadding: () => 112 },
    "@/components/panelui/select": { Select: selectParts },
    "@/components/panelui/bottom-sheet": { BottomSheet: sheetParts },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/text": { Text: "Text" },
  };
}
test("Reports replaces one sheet's content, preserves drafts on Back and discards them on dismiss", async () => {
  const h = hooks();
  const module = await load("src/features/reports/main-screen.tsx", {
    ...sheetMocks(h),
    "@/hooks/use-scoped-read": {
      useScopedRead: () => ({ data: null, busy: false }),
    },
    "@/features/main-fixtures": {
      fixtureReports: [
        {
          id: "r1",
          categoryId: "power",
          typeId: "primary",
          typeTitle: "No power",
          categoryTitle: "No power",
          title: "No power",
          ticketNumber: "AL1",
          displayAddress: "Rawis",
          createdAt: "2026-10-09T01:00:00Z",
        },
      ],
    },
    "./main-filter": {
      filterReportPeriod: (x) => x,
      filterReportTab: (x) => x,
      getReportTabCounts: () => ({ all: 1, open: 1, resolved: 0 }),
    },
    "@/components/panelui/tabs": {
      Tabs: Object.assign(() => null, {
        List: "TabList",
        Trigger: "TabTrigger",
      }),
    },
  });
  const render = () => {
    h.start();
    return module.default();
  };
  const find = (root, predicate) => nodes(root).find(predicate);
  const button = (root, label) =>
    find(
      root,
      (n) => n.type === "Button" && n.props.accessibilityLabel === label,
    );
  const sheet = (root) => find(root, (n) => n.type === sheetParts);
  let root = render();
  button(root, "Report filters").props.onPress();
  root = render();
  assert.equal(sheet(root).props.open, true);
  button(root, "Report type").props.onPress();
  root = render();
  const picker = find(sheet(root), (n) => n.type === selectParts);
  // Only the options of the active sheet view are present, never another sheet.
  assert.equal(picker.props.presentation, "content");
  assert.equal(
    nodes(sheet(root)).filter((n) => n.type === sheetParts).length,
    1,
  );
  picker.props.onValueChange("primary");
  root = render();
  assert.equal(button(root, "Report type").props.children, "No power");
  button(root, "Sort by").props.onPress();
  root = render();
  find(root, (n) => n.type === "SheetContent").props.onBack();
  root = render();
  assert.equal(sheet(root).props.open, true);
  assert.equal(button(root, "Report type").props.children, "No power");
  // Closing before Apply must not make the staged report type an applied filter.
  sheet(root).props.onOpenChange(false);
  root = render();
  button(root, "Report filters").props.onPress();
  root = render();
  assert.equal(button(root, "Report type").props.children, "All report types");
  button(root, "Report type").props.onPress();
  root = render();
  find(sheet(root), (n) => n.type === selectParts).props.onValueChange(
    "primary",
  );
  root = render();
  await find(
    root,
    (n) => n.type === "Button" && n.props.children === "Apply filters",
  ).props.onPress();
  root = render();
  assert.equal(sheet(root).props.open, false);
  button(root, "Report filters").props.onPress();
  root = render();
  assert.equal(button(root, "Report type").props.children, "No power");
});
test("Appearance opens color themes directly, selection closes and Back leaves the setting unchanged", async () => {
  const h = hooks(),
    updates = [];
  let theme = "light";
  const module = await load("src/features/profile/account-screen.tsx", {
    ...sheetMocks(h),
    "expo-router": { useRouter: () => ({}), useFocusEffect() {} },
    uniwind: {
      useUniwind: () => ({ theme, hasAdaptiveThemes: false }),
      Uniwind: {
        setTheme: (v) => {
          theme = v;
          updates.push(v);
        },
      },
    },
    "@/hooks/use-consumer-profile": {
      useConsumerProfile: () => ({ profile: null }),
    },
    "@/components/panelui/dialog": {
      Dialog: Object.assign(() => null, {
        Content: "DialogContent",
        Title: "DialogTitle",
        Description: "DialogDescription",
        Footer: "DialogFooter",
      }),
    },
  });
  const render = () => {
    h.start();
    return module.default();
  };
  const open = () => { nodes(render()).find(n => n.props?.label === "Appearance").props.onPress(); return render(); };
  let root = open();
  assert.equal(nodes(root).filter(n => n.type === sheetParts && n.props.open).length, 1);
  const picker = nodes(root).find(n => n.type === "ThemeSelector");
  assert.equal(picker.props.applyTheme, false);
  assert.ok(nodes(root).some(n => n.type === "Text" && n.props.children === "Choose your color theme"));
  assert.ok(!nodes(root).some(n => n.type === "Button" && n.props.accessibilityLabel === "Color theme"));
  assert.ok(!nodes(root).some(n => n.type === "SheetFooter"));
  nodes(root).find(n => n.type === "Button" && n.props.accessibilityLabel === "Back to Account").props.onPress();
  assert.deepEqual(updates, []);
  assert.equal(nodes(render()).find(n => n.type === sheetParts).props.open, false);
  root = open();
  nodes(root).find(n => n.type === "ThemeSelector").props.onValueChange("dark");
  assert.deepEqual(updates, ["dark"]);
  assert.equal(nodes(render()).find(n => n.type === sheetParts).props.open, false);
  root = open();
  assert.equal(nodes(root).find(n => n.type === "ThemeSelector").props.value, "dark");
  nodes(root).find(n => n.type === sheetParts).props.onOpenChange(false);
  assert.deepEqual(updates, ["dark"]);
});

test("Select content reuses options without rendering a trigger, portal or nested sheet", async () => {
  const h = hooks(),
    selected = [];
  let context;
  let nativeCalls = 0;
  const react = {
    ...h.react,
    Children: {
      forEach: (children, fn) =>
        [children].flat(Infinity).filter(Boolean).forEach(fn),
    },
    isValidElement: (node) => !!node?.props,
    cloneElement: (node, props) => ({
      ...node,
      props: { ...node.props, ...props },
    }),
    useContext: () => context,
  };
  const module = await load("src/components/panelui/select.tsx", {
    react,
    "react/jsx-runtime": jsx,
    "react-native": {
      View: "View",
      Pressable: "Pressable",
      useWindowDimensions: () => ({ height: 900 }),
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 0, bottom: 24 }),
    },
    "react-native-reanimated": {
      default: { View: "AnimatedView" },
      useSharedValue: (v) => ({ value: v }),
      useAnimatedStyle: (fn) => fn(),
      withTiming: (v) => v,
    },
    "tailwind-variants": {
      tv: () => () => new Proxy({}, { get: () => () => "" }),
    },
    uniwind: { useCSSVariable: () => ["gray"] },
    "@/lib/native": {
      getNativeUI: () => {
        nativeCalls++;
        return {};
      },
    },
    "@/hooks/use-back-handler": { useBackHandler() {} },
    "@/components/panelui/native-select-contract": {
      nativeSelectSupportsOptions: () => true,
    },
    "@/components/panelui/text": { Text: "Text", textChildren: (x) => x },
    "@/components/panelui/bottom-sheet": { BottomSheet: sheetParts },
  });
  const option = {
    type: module.Select.Item,
    props: { value: "dark", label: "Dark" },
  };
  h.start();
  const root = module.Select({
    presentation: "content",
    native: true,
    value: "light",
    onValueChange: (v) => selected.push(v),
    children: option,
  });
  context = root.props.value;
  assert.equal(
    nativeCalls,
    0,
    "embedded content must not invoke a platform picker",
  );
  assert.equal(
    nodes(root).some((n) => n.type === sheetParts || n.type === "Pressable"),
    false,
  );
  assert.ok(nodes(root).includes(option));
  context.onSelect("dark");
  assert.deepEqual(selected, ["dark"]);
  context.value = "dark";
  module.Select.Item({ value: "dark", label: "Dark" }).props.onPress();
  assert.deepEqual(selected, ["dark", "dark"], "confirming the current Select value must still close or leave the content view");
  h.start();
  const disabled = module.Select.Item({
    value: "dark",
    label: "Dark",
    disabled: true,
  });
  assert.equal(disabled.props.disabled, true);
  const rich = module.Select.Item({ value: "dark", label: "Dark", description: "Always use the dark theme", startContent: jsx.jsx("Moon", {}) });
  assert.ok(nodes(rich).some(n => n.type === "Moon"));
  assert.equal(rich.props.description, "Always use the dark theme");
  assert.equal(rich.props.accessibilityLabel, "Dark, Always use the dark theme");
});

test("Carousel drag uses one frozen origin across movement events and advances one slide", async () => {
  const h = hooks();
  const requests = [];
  let callbacks;
  const module = await load("src/components/panelui/carousel.tsx", {
    react: {
      ...h.react,
      Children: { toArray: (x) => (Array.isArray(x) ? x : [x]) },
      forwardRef: (fn) => (props) => fn(props, null),
      useImperativeHandle: () => {},
    },
    "react/jsx-runtime": jsx,
    "react-native": { View: "View", Pressable: "Pressable" },
    "react-native-gesture-handler": {
      GestureDetector: "GestureDetector",
      Gesture: {
        Pan() {
          callbacks = {};
          const pan = {
            enabled: () => pan,
            activeOffsetX: () => pan,
            activeOffsetY: () => pan,
            onBegin: (fn) => ((callbacks.begin = fn), pan),
            onUpdate: (fn) => ((callbacks.update = fn), pan),
            onEnd: (fn) => ((callbacks.end = fn), pan),
            onFinalize: () => pan,
          };
          return pan;
        },
      },
    },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView" },
      useSharedValue: (value) =>
        h.react.useRef({
          value,
          set(next) {
            this.value = next;
          },
        }).current,
      useReducedMotion: () => true,
      cancelAnimation: () => {},
      withTiming: (x) => x,
      withSpring: (x) => x,
      runOnJS: (fn) => fn,
    },
    "@/hooks/use-app-reduced-motion": { useAppReducedMotion: () => true },
    "@/components/panelui/controllable-state": {
      useControllableState: () => ({
        value: 2,
        isControlled: false,
        setValue: (index) => requests.push(index),
      }),
    },
    "@/components/panelui/carousel-lifecycle": {
      normalizeCarouselIndex: (i, count) => Math.max(0, Math.min(i, count - 1)),
      useCarouselIndexLifecycle: ({ requestedIndex }) => requestedIndex,
      useCarouselAutoplay: () => {},
    },
    "@/components/panelui/text": { textChildren: (x) => x },
    "@/lib/cn": { cn: (...x) => x.filter(Boolean).join(" ") },
  });
  function render() {
    h.start();
    return module.Carousel({ defaultIndex: 2 });
  }
  let tree = render();
  tree.props.value.setCount(3);
  tree.props.children.props.children.props.onLayout({
    nativeEvent: { layout: { width: 360, height: 160 } },
  });
  tree = render();
  callbacks.begin();
  for (const translationX of [18, 36, 72, 108, 144])
    callbacks.update({ translationX, translationY: 0 });
  assert.equal(
    tree.props.value.progress.value,
    1.6,
    "cumulative translations must be measured from touch-down",
  );
  callbacks.end({
    translationX: 144,
    translationY: 0,
    velocityX: 0,
    velocityY: 0,
  });
  assert.deepEqual(
    requests,
    [1],
    "one rightward drag from slide3 must settle on slide2",
  );
});

test("Reports entry actions open real child routes and preserve detail account context", async () => {
  const h = hooks(),
    visits = [];
  const report = {
    id: "r1",
    serviceAccountId: "account-2",
    categoryId: "power",
    categoryTitle: "No power",
    title: "No power",
    ticketNumber: "AL1",
    displayAddress: "Rawis",
    createdAt: "2026-10-09T01:00:00Z",
  };
  const module = await load("src/features/reports/main-screen.tsx", {
    ...sheetMocks(h),
    "expo-router": {
      useRouter: () => ({ push: (route) => visits.push(route) }),
    },
    "@/hooks/use-scoped-read": {
      useScopedRead: () => ({ data: null, busy: false }),
    },
    "@/features/main-fixtures": { fixtureReports: [report] },
    "./main-filter": {
      filterReportPeriod: (x) => x,
      filterReportTab: (x) => x,
      getReportTabCounts: () => ({ all: 1, open: 1, resolved: 0 }),
    },
    "@/components/panelui/tabs": {
      Tabs: Object.assign(() => null, {
        List: "TabList",
        Trigger: "TabTrigger",
      }),
    },
  });
  h.start();
  const tree = module.default();
  const list = nodes(tree).find((n) => n.type === "FlatList");
  const header = list.props.ListHeaderComponent;
  nodes(header)
    .find((n) => n.props.title === "Reports")
    .props.action.props.onPress();
  nodes(header)
    .find(
      (n) =>
        n.type === "Button" && n.props.children?.props?.children === "View all",
    )
    .props.onPress();
  list.props.renderItem({ item: report }).props.onPress();
  assert.deepEqual(visits, [
    "/reports/new",
    {
      pathname: "/reports/list",
      params: { ...reportBrowseFilter.defaultBrowseFilters, query: "" },
    },
    {
      pathname: "/reports/[id]",
      params: { id: "r1", serviceAccountId: "account-2" },
    },
  ]);
});

test("notification report alias preserves account and focus, and rejects invalid identifiers", async () => {
  let params = {
    id: "ticket-2",
    serviceAccountId: "account-2",
    focus: "updates",
  };
  const module = await load("src/app/report/[id].tsx", {
    "react/jsx-runtime": jsx,
    "expo-router": { Redirect: "Redirect", useLocalSearchParams: () => params },
  });
  assert.deepEqual(module.default().props.href, {
    pathname: "/reports/[id]",
    params,
  });
  params = { id: ["ticket-2", "ticket-3"] };
  assert.equal(module.default().props.href, "/reports/list");
  params = { id: "   " };
  assert.equal(module.default().props.href, "/reports/list");
});

test("report actions follow the keyboard and reserve the measured footer clearance", async () => {
  const h = hooks();
  const module = await load("src/features/reports/components/report-page.tsx", {
    react: h.react,
    "react/jsx-runtime": jsx,
    "react-native": { View: "View" },
    "react-native-keyboard-controller": {
      KeyboardAwareScrollView: "Aware",
      KeyboardStickyView: "Sticky",
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 28, bottom: 20 }),
    },
    "expo-router": { useRouter: () => ({ canGoBack: () => true, back() {} }) },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/preview-label": { PreviewLabel: "Preview" },
    "@/hooks/use-app-colors": { useAppColors: () => ["gray"] },
  });
  const render = () => {
    h.start();
    return module.ReportPage({
      title: "New report",
      children: "field",
      footer: "Continue",
    });
  };
  let tree = render();
  const sticky = nodes(tree).find((n) => n.type === "Sticky");
  assert.ok(sticky, "the fixed actions must follow the keyboard");
  sticky.props.children.props.onLayout({
    nativeEvent: { layout: { height: 84 } },
  });
  tree = render();
  const scroll = nodes(tree).find((n) => n.type === "Aware");
  assert.equal(
    scroll.props.bottomOffset,
    100,
    "the focused field must clear the footer plus a 16px gap",
  );
});

test("Reports and Profile child deep links hide tabs before nested navigation state is available", async () => {
  let pathname = "/reports/list";
  const module = await load("src/components/floating-tabs-bar.tsx", {
    "react/jsx-runtime": jsx,
    "react-native": { View: "View" },
    "expo-router": { usePathname: () => pathname },
    "@/components/floating-app-bar": { FloatingAppBar: "FloatingAppBar" },
  });
  const props = {
    state: { index: 1, routes: [{ name: "home" }, { name: "reports" }] },
    navigation: { navigate() {} },
  };
  for (pathname of [
    "/reports/new",
    "/reports/list",
    "/reports/queue",
    "/reports/timeline",
    "/reports/period",
    "/reports/report-1",
    ...[
      "details",
      "accounts",
      "link-account",
      "link-requests",
      "change-password",
      "photo",
      "push-notifications",
      "help",
      "about",
      "privacy",
      "terms",
    ].map((name) => "/profile/" + name),
  ]) {
    props.state.routes[1].name = pathname.split("/")[1];
    assert.equal(
      module.FloatingTabsBar(props),
      null,
      pathname + " must hide tabs without nested state",
    );
  }
  for (pathname of [
    "/home",
    "/reports",
    "/advisories",
    "/hotlines",
    "/profile",
  ]) {
    props.state.routes[1].name = pathname.split("/")[1];
    assert.notEqual(
      module.FloatingTabsBar(props),
      null,
      pathname + " keeps the main navigation",
    );
  }
  pathname = "/reports/report-1";
  props.state.routes[1].name = "reports";
  props.state.routes[1].state = { index: 0, routes: [{ name: "[id]" }] };
  assert.equal(module.FloatingTabsBar(props), null);
});

test("Reports stages period/account/status/type filters within one sheet and only Apply changes results", async () => {
  const h = hooks(),
    visits = [];
  const realMainFilter = await import("../src/features/reports/main-filter.ts");
  const module = await load("src/features/reports/main-screen.tsx", {
    ...sheetMocks(h),
    "./main-filter": realMainFilter,
    "expo-router": {
      useRouter: () => ({ push: (r) => visits.push(r) }),
      useLocalSearchParams: () => ({}),
    },
    "@/hooks/use-scoped-read": {
      useScopedRead: () => ({ data: null, busy: false }),
    },
    "@/features/main-fixtures": {
      fixtureReports: [
        {
          id: "r1",
          serviceAccountId: "home",
          typeId: "primary",
          typeTitle: "Primary line",
          status: "verified",
          title: "Line issue",
          ticketNumber: "AL1",
          displayAddress: "Rawis",
          createdAt: "2026-10-09T01:00:00Z",
        },
      ],
      fixtureReportAccounts: [
        { id: "home", registeredName: "Home", accountNumber: "10004821" },
      ],
    },
    "@/components/panelui/tabs": {
      Tabs: Object.assign(() => null, {
        List: "TabList",
        Trigger: "TabTrigger",
      }),
    },
    "@/components/panelui/label": { Label: "Label" },
  });
  const render = () => {
    h.start();
    return module.default();
  };
  const button = (root, label) =>
    nodes(root).find(
      (n) => n.type === "Button" && n.props.accessibilityLabel === label,
    );
  let root = render();
  assert.equal(button(nodes(root).find(n => n.type === "FlatList").props.ListHeaderComponent, "Reporting period"), undefined, "period is hidden from the overview");
  button(root, "Report filters").props.onPress();
  root = render();
  assert.ok(button(root, "Reporting period"));
  button(root, "Reporting period").props.onPress();
  root = render();
  nodes(root).find(n => n.props?.accessibilityLabel === "Reporting period" && n.props.onValueChange).props.onValueChange("custom");
  root = render();
  const calendar = nodes(root).find(n => n.props?.mode === "range");
  assert.ok(calendar, "custom range replaces this sheet's content");
  assert.equal(nodes(root).filter(n => n.type === sheetParts).length, 1);
  assert.equal(calendar.props.minDate.getFullYear(), 2026);
  assert.equal(calendar.props.minDate.getMonth(), 0);
  assert.equal(calendar.props.minDate.getDate(), 1);
  calendar.props.onSelect({ from: new Date(2026, 9, 1), to: new Date(2026, 9, 17) });
  root = render();
  nodes(root).find(n => n.type === "Button" && n.props.children === "Use selected dates").props.onPress();
  root = render();
  assert.equal(button(root, "Reporting period").props.children, "2026-10-01 – 2026-10-17");
  assert.equal(visits.length, 0, "no route or nested sheet is opened");
  for (const label of [
    "Service account",
    "Report status",
    "Report type",
    "Sort by",
  ])
    assert.ok(button(root, label), "missing " + label);
  button(root, "Report status").props.onPress();
  root = render();
  const picker = nodes(root).find(
    (n) => n.type === selectParts && n.props.presentation === "content",
  );
  assert.ok(picker);
  picker.props.onValueChange("resolved");
  root = render();
  assert.equal(
    nodes(root).find((n) => n.type === "FlatList").props.data.length,
    1,
    "filter must remain staged",
  );
  nodes(root)
    .find((n) => n.type === "Button" && n.props.children === "Apply filters")
    .props.onPress();
  root = render();
  assert.equal(
    nodes(root).find((n) => n.type === "FlatList").props.data.length,
    0,
    "applied status must filter rows",
  );
});

test("Reporting period validates custom dates and returns them without losing the caller", async () => {
  const h = hooks(),
    visits = [];
  const module = await load("src/features/reports/report-period-screen.tsx", {
    ...sheetMocks(h),
    "expo-router": {
      useLocalSearchParams: () => ({
        period: "custom",
        firstReportDate: "2026-10-01",
        start: "2026-10-09",
        end: "2026-10-01",
      }),
      useRouter: () => ({ dismissTo: (r) => visits.push(r) }),
    },
    "./components/report-page": { ReportPage: "Page" },
  });
  const render = () => {
    h.start();
    return module.default();
  };
  const apply = (root) =>
    nodes(root).find(
      (n) => n.type === "Button" && n.props.children === "Apply period",
    );
  let root = render();
  assert.equal(apply(root).props.disabled, true);
  const picker = nodes(root).find(n => n.type === "Calendar");
  assert.equal(picker.props.mode, "range");
  assert.equal(picker.props.weekStartsOn, "auto");
  assert.equal(picker.props.selectOutsideDays, true);
  assert.equal(reportBrowseFilter.reportPickerDateKey(picker.props.defaultMonth), reportBrowseFilter.manilaDateKey(new Date()));
  assert.equal(reportBrowseFilter.reportPickerDateKey(picker.props.minDate),"2026-01-01");
  assert.equal(reportBrowseFilter.reportPickerDateKey(picker.props.maxDate), reportBrowseFilter.manilaDateKey(new Date()));
  picker.props.onSelect({ from: new Date(2026,9,9) });
  root = render();
  assert.equal(apply(root).props.disabled,true,"half-selected ranges cannot apply");
  nodes(root).find(n => n.type === "Calendar").props.onSelect({from: new Date(2026,9,9),to:new Date(2026,9,10)});
  root = render();
  assert.equal(apply(root).props.disabled, false);
  apply(root).props.onPress();
  assert.deepEqual(visits, [
    {
      pathname: "/reports",
      params: { period: "custom", start: "2026-10-09", end: "2026-10-10" },
    },
  ]);
});

test("Main retains older reports without optional account ids in an account-scoped server response", async () => {
  const h = hooks(),
    realMainFilter = await import("../src/features/reports/main-filter.ts");
  const module = await load("src/features/reports/main-screen.tsx", {
    ...sheetMocks(h),
    "./main-filter": realMainFilter,
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session: { user: { id: "consumer" } } }),
    },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({
        accountContext: {
          identityUserId: "consumer",
          accessRevision: 1,
          accounts: [
            { id: "home", registeredName: "Home", accountNumber: "10004821" },
          ],
        },
      }),
    },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures: false }),
    },
    "@/hooks/use-scoped-read": {
      useScopedRead: () => ({
        data: {
          reports: [
            {
              id: "legacy",
              serviceAccountId: null,
              typeId: "primary",
              typeTitle: "Primary line",
              status: "verified",
              title: "Line issue",
              ticketNumber: "AL1",
              displayAddress: "Rawis",
              createdAt: "2026-10-09T01:00:00Z",
            },
          ],
        },
        busy: false,
      }),
    },
    "@/components/panelui/tabs": {
      Tabs: Object.assign(() => null, {
        List: "TabList",
        Trigger: "TabTrigger",
      }),
    },
  });
  const render = () => {
    h.start();
    return module.default();
  };
  let root = render();
  nodes(root).find(n => n.type === "Button" && n.props.accessibilityLabel === "Report filters").props.onPress();
  root = render();
  nodes(root).find(n => n.type === "Button" && n.props.accessibilityLabel === "Service account").props.onPress();
  root = render();
  nodes(root).find(n => n.type === selectParts && n.props.presentation === "content").props.onValueChange("home");
  root = render();
  nodes(root).find(n => n.type === "Button" && n.props.children === "Apply filters").props.onPress();
  root = render();
  assert.equal(
    nodes(root).find((n) => n.type === "FlatList").props.data.length,
    1,
    "server-scoped legacy rows must remain visible",
  );
});

test("Native Select preserves rich and disabled option semantics through the styled fallback", () => {
  assert.equal(nativeSelectSupportsOptions([{}]), true);
  for (const option of [{ disabled: true }, { description: "Theme details" }, { startContent: "Moon" }]) {
    assert.equal(nativeSelectSupportsOptions([option]), false);
  }
});

test("Reports manual pulls stay visible until complete and background reads stay silent", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = hooks(),
    realMainFilter = await import("../src/features/reports/main-filter.ts");
  const module = await load("src/features/reports/main-screen.tsx", {
    ...sheetMocks(h),
    "./main-filter": realMainFilter,
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session: { user: { id: "consumer" } } }),
    },
    "@/hooks/use-consumer-account": {
      useConsumerAccount: () => ({
        accountContext: {
          identityUserId: "consumer",
          accessRevision: 1,
          accounts: [
            { id: "home", registeredName: "Home", accountNumber: "10004821" },
          ],
        },
      }),
    },
    "@/context/visual-preview-context": {
      useVisualPreview: () => ({ fixtures: false }),
    },
    "@/hooks/use-scoped-read": {
      useScopedRead: () => ({
        data: {
          reports: [
            {
              id: "legacy",
              serviceAccountId: null,
              typeId: "primary",
              typeTitle: "Primary line",
              status: "verified",
              title: "Line issue",
              ticketNumber: "AL1",
              displayAddress: "Rawis",
              createdAt: "2026-10-09T01:00:00Z",
            },
          ],
        },
        busy: false,
        reload: () => pending,
      }),
    },
    "@/components/panelui/tabs": {
      Tabs: Object.assign(() => null, {
        List: "TabList",
        Trigger: "TabTrigger",
      }),
    },
  });
  const render = () => {
    h.start();
    return module.default();
  };
  let root = render();
  const list = () => nodes(root).find(n => n.type === "FlatList");
  assert.equal(list().props.refreshing,false,"background fetch is silent");
  const refreshing = list().props.onRefresh();
  root=render();
  assert.equal(list().props.refreshing,true,"only the pull starts the indicator");
  finish();
  await refreshing;
  root=render();
  assert.equal(list().props.refreshing,false);
});


test("notification toast uses readable neutral text while its indicator retains severity", async () => {
  const source = await readFile(new URL("../src/app/_layout.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("root.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "AppToast");
  const compiled = ts.transpileModule('const Toast = require("toast").Toast;\n' + fn.getText(ast) + '\nexport { AppToast };', { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {}; const Toast = Object.assign(() => null, { Indicator: "Indicator", Content: "Content", Title: "Title", Description: "Description" });
  new Function("require", "exports", compiled)(id => id === "react/jsx-runtime" ? jsx : { Toast }, exports);
  for (const action of ["info", "success", "error"]) {
    const rendered = exports.AppToast({ title: "Report updated", message: "Your report has been verified.", action });
    assert.equal(rendered.props.variant, action === "error" ? "destructive" : action);
    const title = nodes(rendered).find(n => n.type === "Title");
    const description = nodes(rendered).find(n => n.type === "Description");
    assert.equal(title.props.className, "text-popover-foreground");
    assert.equal(description.props.className, "text-popover-foreground");
    assert.equal(title.props.children, "Report updated");
    assert.equal(description.props.children, "Your report has been verified.");
  }
});

test("legal notice return preserves report navigation and normal profile return", async () => {
  const h = hooks(), calls = [];
  const module = await load("src/features/profile/support-screen.tsx", {
    react: h.react, "react/jsx-runtime": jsx, "react-native": { View: "View", Linking: {} },
    "expo-router": { useRouter: () => ({ canGoBack: () => true, back: () => calls.push("back"), replace: route => calls.push(route) }) },
    "@/components/panelui/button": { Button: "Button" }, "@/components/panelui/text": { Text: "Text" },
    "@/hooks/use-app-colors": { useAppColors: () => ["blue"] }, "@/features/reports/components/report-page": { ReportPage: "ReportPage" },
  });
  h.start(); const legal = module.SupportScreen({ kind: "terms", returnToReport: true });
  assert.equal(legal.props.footer.props.children, "Back to report"); legal.props.footer.props.onPress();
  h.start(); const profile = module.SupportScreen({ kind: "privacy" });
  assert.equal(profile.props.footer.props.children, "Back to Account"); profile.props.footer.props.onPress();
  assert.deepEqual(calls, ["back", "/profile"]);
});

test("default compact tabs retain their 48-point touch target", async () => {
  const source = await readFile(new URL("../src/components/panelui/tabs.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("tabs.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "TRIGGER_HIT_SLOP") initializer = node.initializer.getText(ast); ts.forEachChild(node, visit); }
  visit(ast);
  const hitSlop = new Function("return (" + initializer + ")")().md;
  assert.equal(32 + hitSlop.top + hitSlop.bottom, 48);
});


test("border-free Input preserves variant, class and inline fills and shows focus without shifting geometry", async () => {
  const { tv } = await import("tailwind-variants");
  const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean).map(flatten)) : value ?? {};
  for (const props of [{}, {variant:"filled"}, {className:"bg-card"}, {style:{backgroundColor:"rgba(255,255,255,0.14)"}}]) {
    const h = hooks();
    const module = await load("src/components/panelui/input.tsx", {
      react: {...h.react, forwardRef: fn => fn}, "react/jsx-runtime": jsx,
      "react-native": {View:"View", TextInput:"TextInput", StyleSheet:{flatten}},
      "tailwind-variants": {tv},
      uniwind: {useCSSVariable: token => ({"--color-input":"#E7ECF2","--color-accent":"#DFEEFA","--color-ring":"#006BB8"})[token],
        useResolveClassNames: classes => ({backgroundColor: classes.includes("bg-card") ? "#FFFFFF" : classes.includes("bg-muted") ? "#DDE4EC" : "#E7ECF2"})},
      "react-native-reanimated": {__esModule:true, default:{createAnimatedComponent: () => "TextInput", View:"FocusIndicator"},
        useSharedValue: value => h.react.useRef({value}).current, useAnimatedStyle: fn => fn(),
        withTiming: value => value, interpolateColor: (value, range, colors) => colors[value===1 ? 1 : 0]},
      "@/components/panelui/label": {Label:"Label"},
      "@/components/panelui/text": {Text:"Text", textChildren:value=>value},
      "@/components/panelui/input-content-padding": {inputContentPadding:()=>0},
    });
    const render = () => {h.start();const root=module.Input({...props,label:"Email"});h.flush();return root;};
    let root=render();
    const field=nodes(root).find(n=>n.type==="TextInput");
    const resting=flatten(field.props.style).backgroundColor;
    assert.equal(resting, props.style?.backgroundColor ?? (props.className ? "#FFFFFF" : props.variant ? "#DDE4EC" : "#E7ECF2"));
    assert.equal(nodes(root).find(n=>n.type==="FocusIndicator").props.style.opacity,0);
    field.props.onFocus({});render();root=render();
    const indicator=nodes(root).find(n=>n.type==="FocusIndicator");
    assert.equal(indicator.props.style.opacity,1);
    if (props.style) assert.equal(flatten(nodes(root).find(n=>n.type==="TextInput").props.style).backgroundColor,resting);
    assert.equal(indicator.props.style.backgroundColor, props.style ? "#ffffff" : "#006BB8");
    assert.match(indicator.props.className,/absolute/);
    assert.equal(nodes(root).find(n=>n.type==="TextInput").props.className,field.props.className);
    nodes(root).find(n=>n.type==="TextInput").props.onBlur({});render();root=render();
    assert.equal(flatten(nodes(root).find(n=>n.type==="TextInput").props.style).backgroundColor,resting);
  }
});
