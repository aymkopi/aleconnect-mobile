import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function bar(index = 0, accepted = true, reduced = false) {
  const values = [], calls = [], handlers = {};
  const pan = new Proxy({}, { get: (_, name) => (value) => { handlers[name] = value; return pan; } });
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "@/context/app-guide-context": { GuideStep: "View" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useCallback: (callback) => callback, useRef: () => ({ current: false }), useEffect: (effect) => effect() },
    "lucide-react-native": {},
    "react-native": { View: "View", Pressable: "Pressable", useWindowDimensions: () => ({ width: 390, fontScale: 1 }) },
    "react-native-gesture-handler": { Gesture: { Pan: () => pan }, GestureDetector: "GestureDetector" },
    "react-native-reanimated": {
      __esModule: true, default: { View: "AnimatedView", createAnimatedComponent: (component) => component },
      useSharedValue: (initial) => { const value = { current: initial, get() { return this.current; }, set(next) { this.current = next; } }; values.push(value); return value; },
      useReducedMotion: () => reduced, useAnimatedStyle: (style) => style(), cancelAnimation() {}, runOnJS: (fn) => fn,
      withSpring: (value) => value, withTiming: (value) => value, withSequence: (...steps) => steps.at(-1), ReduceMotion: { System: "system" },
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "@/components/panelui/text": { Text: "Text" },
    "@/hooks/use-app-colors": { useAppColors: () => ["white", "blue", "gray"] },
    "@/hooks/use-app-reduced-motion": { useAppReducedMotion: () => reduced },
  };
  const source = readFileSync(new URL("../src/components/floating-app-bar.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)((id) => { if (!modules[id]) throw new Error(id); return modules[id]; }, exports);
  const tree = exports.FloatingAppBar({ currentIndex: index, onSelect: (target) => { calls.push(target); return accepted; } });
  const presses=[];
  function walk(node){if(node?.type==='Pressable')presses.push(node.props.onPress); for(const child of [node?.props?.children].flat(Infinity))if(child)walk(child);}
  walk(tree);
  return { handlers, values, calls, presses, slot: (390 - 32 - 12) / 5 };
}

test("pill drag follows the touch and commits the closest tab only on release", () => {
  const h = bar(1), x = 6 + h.slot * 1.5;
  h.handlers.onBegin({ x, y: 32 });
  h.handlers.onStart({ translationX: 9 });
  h.handlers.onUpdate({ translationX: h.slot * 1.6 });
  assert.equal(h.values[0].get(), 2.6);
  assert.deepEqual(h.calls, []);
  h.handlers.onEnd();
  h.handlers.onFinalize({}, true);
  assert.deepEqual(h.calls, [3]);
  assert.equal(h.values[0].get(), 3);
  h.presses[1]();
  assert.deepEqual(h.calls, [3], "release cannot also click the tab where the drag began");
});

test("a swipe starting outside the pill moves from the selected tab without jumping to the touch", () => {
  const h = bar(2);
  h.handlers.onBegin({ x: 12, y: 32 });
  h.handlers.onStart({ translationX: -9 });
  h.handlers.onUpdate({ translationX: -h.slot * 0.8 });
  assert.equal(h.values[0].get(), 1.2);
  h.handlers.onEnd();
  assert.deepEqual(h.calls, [1]);
  assert.deepEqual(h.handlers.activeOffsetX, [-8, 8]);
  assert.deepEqual(h.handlers.failOffsetY, [-12, 12]);
});

test("drag edges clamp, canceled gestures restore selection, and short drags do not navigate", () => {
  const h = bar(2);
  h.handlers.onBegin({ x: 180, y: 32 }); h.handlers.onStart({ translationX: 9 });
  h.handlers.onUpdate({ translationX: 9_000 }); assert.equal(h.values[0].get(), 4);
  h.handlers.onFinalize({}, false); assert.equal(h.values[0].get(), 2);
  h.handlers.onBegin({ x: 180, y: 32 }); h.handlers.onStart({ translationX: -9 });
  h.handlers.onUpdate({ translationX: -9_000 }); assert.equal(h.values[0].get(), 0);
  h.handlers.onFinalize({}, false);
  h.handlers.onBegin({ x: 180, y: 32 }); h.handlers.onStart({ translationX: 9 }); h.handlers.onEnd();
  assert.deepEqual(h.calls, []);
  assert.equal(h.values[0].get(), 2);
});

test("guest or prevented navigation restores the current pill, including reduced motion", () => {
  const h = bar(0, false, true);
  h.handlers.onBegin({ x: 30, y: 32 }); h.handlers.onStart({ translationX: 9 });
  h.handlers.onUpdate({ translationX: h.slot }); h.handlers.onEnd();
  assert.deepEqual(h.calls, [1]);
  assert.equal(h.values[0].get(), 0);
});
