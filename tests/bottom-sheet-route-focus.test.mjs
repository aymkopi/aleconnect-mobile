import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
for (const controlled of [true, false])
  test(
    "sheet closes on owning route blur (" +
      (controlled ? "controlled" : "uncontrolled") +
      ")",
    async () => {
      let blur,
        unsubscribe = false,
        stored = false;
      const changes = [],
        effects = [],
        navContext = {};
      const navigation = {
        addListener: (event, handler) => {
          assert.equal(event, "blur");
          blur = handler;
          return () => (unsubscribe = true);
        },
      };
      const jsx = (type, props) => ({ type, props });
      const react = {
        createContext: () => ({ Provider: "Provider" }),
        forwardRef: (fn) => fn,
        useContext: (context) => (context === navContext ? navigation : null),
        useState: (initial) => [initial, (value) => (stored = value)],
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
        useEffect: (fn) => effects.push(fn),
      };
      const exports = {};
      const source = (
        await readFile(
          new URL(
            "../src/components/panelui/bottom-sheet.tsx",
            import.meta.url,
          ),
          "utf8",
        )
      ).replace(
        "function BottomSheetRoot(",
        "export function BottomSheetRoot(",
      );
      const mocks = {
        react,
        "react/jsx-runtime": { jsx, jsxs: jsx },
        "expo-router": { useNavigation: () => navigation },
        "@/lib/native": { getNativeUI: () => ({}) },
        "react-native": {
          StyleSheet: { create: (value) => value },
          Platform: { OS: "android" },
        },
        "react-native-reanimated": {
          default: { createAnimatedComponent: (value) => value },
        },
        "tailwind-variants": { tv: () => () => "" },
      };
      new Function(
        "require",
        "exports",
        ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
      )((id) => mocks[id] ?? {}, exports);
      const rendered = exports.BottomSheetRoot({
        native: true,
        ...(controlled ? { open: true } : { defaultOpen: true }),
        onOpenChange: (value) => changes.push(value),
      });
      assert.equal(rendered.props.children.props.value.background, true, "Native sheets default to the same semantic surface as styled sheets");
      assert.equal(changes.length, 0);
      const cleanup = effects[0]();
      blur();
      assert.deepEqual(changes, [false]);
      if (!controlled) assert.equal(stored, false);
      cleanup();
      assert.equal(unsubscribe, true);
    },
  );
