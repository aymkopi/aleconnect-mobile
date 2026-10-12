import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as holdMath from "../src/components/panelui/progress-button-hold.ts";
const source = await readFile(
  new URL("../src/components/panelui/progress-button.tsx", import.meta.url),
  "utf8",
);
function mount(reader = false, platform = "android") {
  let now = 0,
    completed = 0,
    stateIndex = 0,
    sequence = 0;
  const timers = new Map(),
    effects = [];
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: {
      createContext: () => ({ Provider: "Provider" }),
      forwardRef: (fn) => fn,
      isValidElement: () => false,
      Children: { toArray: (v) => (v ? [v] : []) },
      useRef: (v) => ({ current: v }),
      useState: (v) => [stateIndex++ === 0 ? reader : v, () => {}],
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect: (fn) => effects.push(fn),
      useLayoutEffect: (fn) => effects.push(fn),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Platform: { OS: platform },
      View: "View",
      Pressable: "Pressable",
      AppState: {
        currentState: "active",
        addEventListener: () => ({ remove() {} }),
      },
      AccessibilityInfo: {
        isScreenReaderEnabled: async () => reader,
        addEventListener: () => ({ remove() {} }),
        announceForAccessibility() {},
      },
    },
    "react-native-reanimated": {
      useSharedValue: (value) => ({
        value,
        set(next) {
          this.value = next;
        },
      }),
      useReducedMotion: () => true,
      cancelAnimation() {},
      withTiming: (value) => value,
      withSpring: (value) => value,
      ReduceMotion: { Never: "never" },
      Easing: { linear: () => {}, steps: () => {} },
    },
    "tailwind-variants": {
      tv: () => () =>
        Object.fromEntries(
          ["root", "content", "label", "fill", "fillLabel"].map((k) => [
            k,
            () => k,
          ]),
        ),
    },
    "@/components/panelui/progress-button-hold": holdMath,
    "@/lib/haptics": { impactKnock() {}, selectionTick() {} },
  };
  const exports = {};
  new Function(
    "require",
    "exports",
    "performance",
    "setTimeout",
    "clearTimeout",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )(
    (id) => mocks[id] ?? {},
    exports,
    { now: () => now },
    (fn, ms) => {
      timers.set(++sequence, { fn, at: now + ms });
      return sequence;
    },
    (id) => timers.delete(id),
  );
  const tree = exports.ProgressButton({
    holdDuration: 3000,
    onComplete: () => completed++,
  });
  effects.forEach((fn) => fn());
  return {
    props: tree.props.children.props,
    get completed() {
      return completed;
    },
    advance(ms) {
      now += ms;
      for (const [id, t] of timers) {
        if (t.at <= now) {
          timers.delete(id);
          t.fn();
        }
      }
    },
  };
}
test("pointer release cancels; a new hold still requires three full seconds with reduced motion", () => {
  const h = mount();
  h.props.onPressIn({ nativeEvent: {} });
  h.advance(2900);
  h.props.onPressOut({ nativeEvent: {} });
  h.advance(200);
  assert.equal(h.completed, 0);
  h.props.onPressIn({ nativeEvent: {} });
  h.advance(2999);
  assert.equal(h.completed, 0);
  h.advance(1);
  assert.equal(h.completed, 1);
  h.props.onPressOut({ nativeEvent: {} });
  h.advance(3000);
  assert.equal(h.completed, 1);
});
test("reader activation offers a cancellable three-second confirmation without a tap completion", () => {
  const h = mount(true);
  assert.equal(h.props.onPressIn, undefined);
  h.props.onPress();
  h.advance(1000);
  assert.equal(h.completed, 0);
  h.props.onPress();
  h.advance(3000);
  assert.equal(h.completed, 0);
  h.props.onPress();
  h.advance(3000);
  assert.equal(h.completed, 1);
});
test("explicit native accessibility action also supports users without the reader flag", () => {
  const h = mount();
  h.props.onAccessibilityAction({ nativeEvent: { actionName: "activate" } });
  h.advance(3000);
  assert.equal(h.completed, 1);
});

test("web reader stub cannot turn a pointer tap into countdown confirmation", () => {
  const h = mount(true, "web");
  h.props.onPressIn({ nativeEvent: {} });
  h.advance(100);
  h.props.onPressOut({ nativeEvent: {} });
  h.props.onPress({ nativeEvent: { detail: 1 } });
  h.advance(4000);
  assert.equal(h.completed, 0);
  h.props.onPressIn({ nativeEvent: {} });
  h.advance(3000);
  assert.equal(h.completed, 1);
});
test("web keyboard or assistive click starts a cancellable full-duration confirmation", () => {
  const h = mount(true, "web");
  const activate = () => {
    h.props.onPressIn({ nativeEvent: { key: " " } });
    h.props.onPressOut({ key: " ", type: "keyup" });
    h.props.onPress({ nativeEvent: { detail: 0 } });
  };
  activate();
  h.advance(1000);
  assert.equal(h.completed, 0);
  activate();
  h.advance(3000);
  assert.equal(h.completed, 0);
  activate();
  h.advance(2999);
  assert.equal(h.completed, 0);
  h.advance(1);
  assert.equal(h.completed, 1);
});
