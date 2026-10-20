import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function stepHarness() {
  const slots = [], effects = [], entries = [];
  const context = { register: (entry) => entries.push(entry), unregister() {} };
  let cursor = 0;
  const same = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createContext: () => ({}),
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (next) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }];
    },
    useMemo(make, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: make() };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: effect() };
      });
    },
    useContext: () => context,
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View" },
    "react-native-reanimated": { __esModule: true, default: { createAnimatedComponent: (value) => value } },
    "react-native-svg": { Path: "Path" },
    "react-native-safe-area-context": {},
    "@/hooks/use-app-reduced-motion": {},
    "@/hooks/use-back-handler": {},
    "@/components/panelui/icons": {},
    "@/components/panelui/portal": {},
    "@/components/panelui/text": {},
    "@/components/panelui/button": {},
    "@/components/panelui/tour-card-measurement": {},
    "@/lib/cn": {},
  };
  const source = readFileSync(new URL("../src/components/panelui/tour.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)((id) => {
    if (!(id in modules)) throw new Error("Unmocked Tour dependency: " + id);
    return modules[id];
  }, exports);
  return {
    entries,
    render(props) {
      cursor = 0;
      const view = exports.Tour.Step(props);
      while (effects.length) effects.shift()();
      return view;
    },
  };
}

test("async target layout changes invalidate Tour measurement and preserve consumer onLayout", () => {
  const h = stepHarness(), calls = [];
  const props = { order: 1, title: "Contact ALECO", onLayout: (event) => calls.push(event) };
  let view = h.render(props);
  const skeleton = { nativeEvent: { layout: { x: 0, y: 150, width: 370, height: 160 } } };
  view.props.onLayout(skeleton);
  view = h.render(props);
  const initial = h.entries.at(-1);
  const contacts = { nativeEvent: { layout: { ...skeleton.nativeEvent.layout, height: 360 } } };
  view.props.onLayout(contacts);
  view = h.render(props);
  assert.notEqual(h.entries.at(-1), initial, "new target bounds must trigger the overlay's active-entry measurement effect");
  const count = h.entries.length;
  view.props.onLayout(contacts);
  h.render(props);
  assert.equal(h.entries.length, count, "an unchanged layout must not repeatedly register the step");
  assert.deepEqual(calls, [skeleton, contacts, contacts]);
});
