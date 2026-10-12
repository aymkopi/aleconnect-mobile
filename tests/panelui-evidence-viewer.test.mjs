import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as photoState from "../src/features/reports/components/evidence-photo-state.ts";

async function viewerHarness() {
  const slots = [],
    pending = [];
  let cursor = 0,
    props;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
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
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps))
        pending.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
    },
  };
  react.useLayoutEffect = react.useEffect;
  const chain = () => {
    const proxy = new Proxy({}, { get: () => () => proxy });
    return proxy;
  };
  const jsx = (type, props) =>
    typeof type === "function" ? type(props) : { type, props };
  const modules = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": {
      Modal: "Modal",
      View: "View",
      useWindowDimensions: () => ({ width: 402 }),
    },
    "expo-image": { Image: "Image" },
    "lucide-react-native": {
      ChevronLeft: "ChevronLeft",
      ChevronRight: "ChevronRight",
    },
    "react-native-gesture-handler": {
      Gesture: {
        Pinch: chain,
        Pan: chain,
        Tap: chain,
        Simultaneous: () => ({}),
      },
      GestureDetector: "GestureDetector",
      GestureHandlerRootView: "GestureHandlerRootView",
    },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView" },
      useSharedValue: (value) => {
        const ref = react.useRef({
          value,
          set(next) {
            this.value = next;
          },
        });
        return ref.current;
      },
      useAnimatedStyle: (fn) => fn(),
    },
    "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/spinner": { Spinner: "Spinner" },
    "@/hooks/use-app-colors": { useAppColors: () => ["#006bb8"] },
    "./report-page": { ReportPage: "ReportPage" },
    "./evidence-photo-state": photoState,
  };
  const source = await readFile(
    new URL(
      "../src/features/reports/components/evidence-photo-viewer.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
  )((name) => {
    assert.ok(name in modules, `Unmocked viewer import: ${name}`);
    return modules[name];
  }, exports);
  return {
    render(nextProps = props) {
      props = nextProps;
      cursor = 0;
      const tree = exports.EvidencePhotoViewer(props);
      while (pending.length) pending.shift()();
      return tree;
    },
  };
}
function nodes(tree, type) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  return [
    ...(tree.type === type ? [tree] : []),
    ...Object.values(tree.props ?? {}).flatMap((value) => nodes(value, type)),
  ];
}
function words(tree) {
  if (typeof tree === "string") return tree;
  if (!tree || typeof tree !== "object") return "";
  if (Array.isArray(tree)) return tree.map(words).join(" ");
  return words(tree.props?.children);
}
function button(tree, label) {
  return nodes(tree, "Button").find((node) => words(node) === label);
}
const photos = [
  { id: "one", uri: "https://evidence.example/1.webp", status: "ready" },
  { id: "two", uri: "https://evidence.example/2.webp", status: "ready" },
];

test("viewer loading, failure and retry actually transition and remount the selected image", async () => {
  const h = await viewerHarness();
  let tree = h.render({ photos, open: true, onClose() {} });
  tree = h.render();
  assert.equal(nodes(tree, "Spinner")[0].props.label, "Loading evidence photo");
  const before = nodes(tree, "Image")[0];
  before.props.onError();
  tree = h.render();
  assert.match(words(tree), /This photo couldn’t load/);
  button(tree, "Retry photo").props.onPress();
  tree = h.render();
  assert.equal(nodes(tree, "Spinner").length, 1);
  const after = nodes(tree, "Image")[0];
  assert.equal(after.props.source.uri, photos[0].uri);
  after.props.onLoad();
  tree = h.render();
  assert.equal(nodes(tree, "Spinner").length, 0);
  assert.equal(button(tree, "Retry photo"), undefined);
});

test("next and previous honor bounds, close works and late image events cannot affect a new photo", async () => {
  const h = await viewerHarness();
  let closed = 0;
  let tree = h.render({
    photos,
    initialIndex: -5,
    open: true,
    onClose() {
      closed++;
    },
  });
  tree = h.render();
  assert.equal(
    nodes(tree, "Button").find(
      (b) => b.props.accessibilityLabel === "Previous evidence photo",
    ).props.disabled,
    true,
  );
  const first = nodes(tree, "Image")[0];
  nodes(tree, "Button")
    .find((b) => b.props.accessibilityLabel === "Next evidence photo")
    .props.onPress();
  tree = h.render();
  const second = nodes(tree, "Image")[0];
  assert.equal(second.props.source.uri, photos[1].uri);
  second.props.onLoad();
  first.props.onError();
  tree = h.render();
  assert.equal(nodes(tree, "Spinner").length, 0);
  assert.equal(button(tree, "Retry photo"), undefined);
  assert.equal(
    nodes(tree, "Button").find(
      (b) => b.props.accessibilityLabel === "Next evidence photo",
    ).props.disabled,
    true,
  );
  nodes(tree, "Modal")[0].props.onRequestClose();
  button(tree, "Back to report").props.onPress();
  assert.equal(closed, 2);
  assert.equal(h.render({ photos, open: false, onClose() {} }), null);
});

test("empty, restricted and processing evidence never request an image", async () => {
  for (const selected of [
    [],
    [
      {
        id: "private",
        uri: "ticket-evidence/private/object.webp",
        status: "ready",
      },
    ],
    [{ id: "failed", uri: photos[0].uri, status: "failed" }],
    [{ id: "processing", uri: "file:///pending.webp", status: "processing" }],
  ]) {
    const h = await viewerHarness();
    let tree = h.render({ photos: selected, open: true, onClose() {} });
    tree = h.render();
    assert.equal(nodes(tree, "Image").length, 0);
    assert.ok(button(tree, "Back to report"));
  }
});

test("bundled Android drawable identifiers render while private object paths remain blocked", async () => {
  const h = await viewerHarness();
  let tree = h.render({
    photos: [
      {
        id: "bundled",
        uri: "assets_aleconnect_reportevidence1",
        status: "ready",
      },
    ],
    open: true,
    onClose() {},
  });
  tree = h.render();
  assert.equal(nodes(tree, "Image").length, 1);
  assert.equal(
    photoState.isViewableEvidenceUri("ticket-evidence/private/object.webp"),
    false,
  );
  assert.equal(photoState.isViewableEvidenceUri("javascript:alert(1)"), false);
});

test("public-update photos reuse zoom and retry without report-specific navigation or copy", async () => {
  const h = await viewerHarness();
  let tree = h.render({ photos, open: true, context: "update", onClose() {} });
  tree = h.render();
  assert.equal(nodes(tree, "Spinner")[0].props.label, "Loading ALECO photo");
  assert.ok(button(tree, "Back to update"));
  assert.doesNotMatch(
    words(tree),
    /Report evidence|Back to report|Original report/,
  );
  nodes(tree, "Image")[0].props.onError();
  tree = h.render();
  assert.match(words(tree), /The update is still available/);
  assert.doesNotMatch(words(tree), /report/);
});
