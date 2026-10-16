import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { manualRefreshHarness } from "./manual-refresh-harness.mjs";

test("Hotline categories use one auto-sized searchable sheet without an ALECO launcher", async () => {
  const slots = [];
  let cursor = 0;
  const useState = (initial) => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial;
    return [
      slots[i],
      (v) => {
        slots[i] = typeof v === "function" ? v(slots[i]) : v;
      },
    ];
  };
  const Sheet = Object.assign(function Sheet() {}, {
    Content: "SheetContent",
    Header: "SheetHeader",
    Body: "SheetBody",
    Footer: "SheetFooter",
  });
  const agency = {
    id: "aleco",
    categoryId: "power",
    name: "ALECO",
    description: "Power support",
    contacts: [
      {
        id: "smart",
        number: "0908 677 3393",
        type: "Smart",
        label: "Customer care",
      },
    ],
  };
  const categories = [
    { id: "power", name: "Power", agencies: [agency] },
    { id: "fire", name: "Fire", agencies: [{ ...agency, id: "fire-agency" }] },
  ];
  const exports = {};
  const src = await readFile(
    new URL("../src/features/hotlines/hotlines-screen.tsx", import.meta.url),
    "utf8",
  );
  new Function(
    "require",
    "exports",
    ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )(
    (id) =>
      ({
        react: { useState, useEffect: () => {} },
        "react/jsx-runtime": {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        },
        "react-native": {
          View: "View",
          ScrollView: "ScrollView",
          RefreshControl: "RefreshControl",
          useWindowDimensions: () => ({ width: 402 }),
        },
        "expo-router": { useRouter: () => ({ push: () => {} }) },
        "react-native-safe-area-context": {
          useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
        },
        "@/hooks/use-auth-session": {
          useAuthSession: () => ({ session: null }),
        },
        "@/context/guest-access-context": { useGuestAccess: () => ({ guest: false, requestSignIn: () => {} }) },
        "@/context/visual-preview-context": {
          useVisualPreview: () => ({ fixtures: true, publicFixtures: true }),
        },
        "@/hooks/use-app-colors": { useAppColors: () => ["blue"] },
        "@/hooks/use-main-page-scroll": { useMainPageScroll: () => ({ current: null }) },
        "@/hooks/use-manual-refresh": manualRefreshHarness({ useState }),
        "@/components/panelui/button": { Button: "Button" },
        "@/hooks/use-scoped-read": {
          useScopedRead: () => ({ data: null, busy: false }),
        },
        "@/features/main-fixtures": { fixtureHotlines: categories },
        "@/components/panelui/bottom-sheet": { BottomSheet: Sheet },
        "@/components/search-field": { SearchField: "Search" },
        "./contact-card": { ContactCard: "ContactCard" },
        "@/components/floating-app-bar": {
          appScrollableBottomPadding: () => 90,
        },
      })[id] ?? {},
    exports,
  );
  const flatten = (node) =>
    !node || typeof node !== "object"
      ? []
      : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  const render = () => {
    cursor = 0;
    return flatten(exports.default());
  };
  let nodes = render();
  const pull = nodes.find(n => n.type === "ScrollView").props.refreshControl;
  assert.equal(pull.type, "RefreshControl");
  assert.equal(pull.props.refreshing, false);
  await assert.doesNotReject(pull.props.onRefresh(), "fixture pulls must not call the live loader");
  assert.ok(!nodes.some(n => n.type === "ContactCard" && n.props.onViewContacts));
  nodes.find(n => n.type === "Button" && n.props.children === "Fire").props.onPress();
  nodes = render();
  assert.equal(nodes.filter((n) => n.type === Sheet && n.props.open).length, 1);
  assert.ok(nodes.some((n) => n.props?.children === "Fire"));
  assert.equal(nodes.find(n => n.type === "SheetContent").props.size, "auto");
  assert.equal(nodes.find(n => n.type === Sheet && n.props.open).props.snapPoints, undefined);
  const search = nodes.find(
    (n) =>
      n.type === "Search" && n.props.placeholder === "Search contact name or number",
  );
  search.props.onChangeText("smart");
  assert.ok(
    render().some(
      (n) =>
        n.type === "ContactCard" &&
        n.props.agency.id === "fire-agency" &&
        !n.props.onViewContacts,
    ),
  );
  search.props.onChangeText("no-match");
  nodes = render();
  assert.ok(
    nodes.some((n) => n.props?.children === "No contacts match your search."),
  );
  nodes.find((n) => n.type === Sheet && n.props.open).props.onOpenChange(false);
  nodes = render();
  assert.equal(nodes.filter((n) => n.type === Sheet && n.props.open).length, 0);
  nodes.find(n => n.type === "Button" && n.props.children === "Fire").props.onPress();
  assert.equal(
    render().find(
      (n) =>
        n.type === "Search" && n.props.placeholder === "Search contact name or number",
    ).props.value,
    "",
  );
});
