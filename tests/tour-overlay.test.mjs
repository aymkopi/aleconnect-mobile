import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function overlayHarness() {
  const slots = [], effects = [];
  let cursor = 0, stateChanges = 0, clockId = 0;
  const frames = new Map(), timers = new Map();
  const schedule = queue => (callback, delay) => { const id = ++clockId; queue.set(id, { callback, delay }); return id; };
  const runNext = queue => { const next = queue.entries().next().value; if (!next) return; queue.delete(next[0]); next[1].callback(); };
  const same = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createContext: () => ({}),
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], next => {
        const value = typeof next === "function" ? next(slots[i]) : next;
        if (!Object.is(value, slots[i])) stateChanges++;
        slots[i] = value;
      }];
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() };
      });
    },
  };
  react.useLayoutEffect = react.useEffect;
  const jsx = (type, props) => ({ type, props });
  const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const measurement = {};
  new Function("exports", compile(readFileSync(new URL("../src/components/panelui/tour-card-measurement.ts", import.meta.url), "utf8")))(measurement);
  const modules = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", ScrollView: "ScrollView", Platform: { OS: "android" }, StyleSheet: { absoluteFill: {} }, useWindowDimensions: () => ({ width: 402, height: 874, fontScale: 1 }) },
    "react-native-reanimated": { __esModule: true, default: { View: "Animated.View", createAnimatedComponent: value => value }, useSharedValue: value => ({ value }), useAnimatedProps: make => make(), withSpring: value => value },
    "react-native-svg": { Path: "Path" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 32, bottom: 24, left: 0, right: 0 }) },
    "@/hooks/use-app-reduced-motion": { useAppReducedMotion: () => true },
    "@/hooks/use-back-handler": {}, "@/components/panelui/icons": {}, "@/components/panelui/portal": {},
    "@/components/panelui/text": { Text: "Text" }, "@/components/panelui/button": { Button: "Button" },
    "@/components/panelui/tour-card-measurement": measurement, "@/lib/cn": { cn: (...classes) => classes.filter(Boolean).join(" ") },
  };
  const source = readFileSync(new URL("../src/components/panelui/tour.tsx", import.meta.url), "utf8") + "\nexport const testOverlay = TourOverlay;";
  const exports = {};
  new Function("require", "exports", "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout", compile(source))(id => {
    assert.ok(id in modules, "Unmocked Tour dependency: " + id); return modules[id];
  }, exports, schedule(frames), id => frames.delete(id), schedule(timers), id => timers.delete(id));
  const renderTree = (active, overrides = {}) => {
      cursor = 0;
      const tree = exports.testOverlay({ active, index: active.order, total: 2, isFirst: active.order === 0, isLast: active.order === 1,
        padding: 8, radius: 12, shape: "rect", placement: "auto", dismissible: true, showProgress: true, showSkip: true,
        interactive: false, overlayColor: "black", words: { next: "Next", back: "Back", done: "Done", skip: "Skip", close: "End tour" },
        onNext() {}, onBack() {}, onSkip() {}, ...overrides });
      while (effects.length) effects.shift()();
      return tree;
  };
  return {
    render: (active, overrides) => renderTree(active, overrides).props.children.at(-1).props.children,
    renderTree,
    position: (active) => renderTree(active).props.children.at(-1).props.style,
    runFrame: () => runNext(frames),
    runTimer: () => runNext(timers),
    pending: () => frames.size + timers.size,
    stateChanges: () => stateChanges,
    unmount: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}
const entry = (order = 0) => ({ order, title: "Find what you need", description: "Search services and updates.", target: { current: null }, layout: null });
function measure(card, height) {
  if (card.props.onContentSizeChange) card.props.onContentSizeChange(370, height);
  else card.props.onLayout({ nativeEvent: { layout: { height } } });
}

test("a target relayout never hides the already measured description card for the same step", () => {
  const h = overlayHarness(), first = entry();
  let card = h.render(first);
  measure(card, 240);
  assert.equal(h.render(first).props.style.opacity, 1);
  const moved = { ...first, layout: { x: 0, y: 100, width: 370, height: 320 } };
  assert.equal(h.render(moved).props.style.opacity, 1, "re-registering target bounds must not hide unchanged guide content");
});

test("backdrop taps can be ignored while explicit Tour actions remain available", () => {
  const h = overlayHarness();
  let closed = 0;
  const tree = h.renderTree(entry(), { dismissOnBackdropPress: false, onSkip: () => closed++ });
  const backdrop = tree.props.children[0];
  const blocker = backdrop.type(backdrop.props);
  assert.equal(blocker.props.onStartShouldSetResponder(), true, "taps must not reach the real app control");
  blocker.props.onResponderRelease?.();
  assert.equal(closed, 0, "an accidental tap must not end the guide");
  const card = tree.props.children.at(-1).props.children;
  const close = card.props.children.find(child => child?.props?.accessibilityLabel === "End tour");
  assert.ok(close, "the explicit End tour control stays available");
  close.props.onPress();
  assert.equal(closed, 1);
});

test("native Tour cards measure content inside a bounded viewport and cap tall copy", () => {
  const h = overlayHarness(), first = entry();
  let card = h.render(first);
  assert.ok(card.props.style.height > 0, "native ScrollView must have room to measure before its first content event");
  card.props.onContentSizeChange(370, 240);
  card = h.render(first);
  assert.equal(card.props.style.height, 240);
  assert.equal(card.props.style.opacity, 1);
  const previousContentSizeChange = card.props.onContentSizeChange;
  card.props.onContentSizeChange(370, 2000);
  card = h.render(first);
  assert.ok(card.props.style.height <= 874 - 32 - 24 - 32, "long guide copy stays inside safe-area bounds");
  const next = entry(1);
  card = h.render(next);
  assert.equal(card.props.style.opacity, 0, "a different step waits for its own content measurement");
  assert.ok(card.props.style.height > 0);
  card.props.onContentSizeChange(370, 210);
  assert.equal(h.render(next).props.style.opacity, 1);
  previousContentSizeChange(370, 240);
  assert.equal(h.render(next).props.style.opacity, 1, "late measurements from an unmounted step must not hide the current card");
});


test("a scrolled ancestor moves the current spotlight without re-registering its target", () => {
  const h = overlayHarness(), active = entry();
  let y = 240;
  active.target.current = { measureInWindow: done => done(10, y, 300, 60) };
  h.render(active);
  h.runFrame();
  measure(h.render(active), 160);
  const before = h.position(active).top;
  y = 60;
  h.runTimer();
  const after = h.render(active);
  assert.equal(h.position(active).top, before - 180, "ancestor scrolling must move the spotlight/card by the real offset");
  assert.equal(after.props.style.opacity, 1, "remeasuring position must not hide the description");
  const changes = h.stateChanges();
  h.runTimer();
  h.render(active);
  assert.equal(h.stateChanges(), changes, "stationary targets must not cause React state churn");
  h.unmount();
  assert.equal(h.pending(), 0, "position tracking ends with the overlay");
});

test("a late target measurement cannot overwrite a newer step or restart tracking", () => {
  const h = overlayHarness(), first = entry(), next = entry(1);
  let finishFirst;
  first.target.current = { measureInWindow: done => { finishFirst = done; } };
  next.target.current = { measureInWindow: done => done(10, 60, 300, 60) };
  h.render(first);
  h.runFrame();
  h.render(next);
  h.runFrame();
  measure(h.render(next), 160);
  const currentTop = h.position(next).top;
  finishFirst(10, 500, 300, 60);
  assert.equal(h.position(next).top, currentTop);
  h.unmount();
  finishFirst(10, 600, 300, 60);
  assert.equal(h.pending(), 0);
});
