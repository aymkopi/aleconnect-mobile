import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { authReturnRoute } from "../src/features/auth/auth-state.ts";

test("the app mounts one stable native keyboard provider", async () => {
  const source = await readFile(
    new URL("../src/components/panelui/panel-ui-provider.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /import \{ KeyboardProvider \} from ['"]react-native-keyboard-controller['"]/,
  );
  assert.doesNotMatch(source, /const KeyboardProvider = resolve/);
  const root = await readFile(
    new URL("../src/app/_layout.tsx", import.meta.url),
    "utf8",
  );
  assert.equal((root.match(/<PanelUIProvider\b/g) || []).length, 1);
  assert.doesNotMatch(
    root,
    /<GestureHandlerRootView|<KeyboardProvider|<PortalProvider/,
  );
});

test("mandatory password setup blocks all main destinations, including direct links", async () => {
  const source = await readFile(
    new URL("../src/app/(tabs)/_layout.tsx", import.meta.url),
    "utf8",
  );
  const Redirect = Symbol("Redirect"),
    Tabs = () => null;
  Tabs.Screen = () => null;
  let mustChangePassword = true,
    pathname = "/reports/new";
  const mocks = {
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "expo-router": { Tabs, Redirect, usePathname: () => pathname },
    "@/features/auth/auth-state": { authReturnRoute },
    "@/components/floating-tabs-bar": { FloatingTabsBar: () => null },
    "@/hooks/use-app-colors": { useAppColors: () => ["white"] },
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session: { user: { mustChangePassword } } }),
    },
  };
  const exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )((id) => mocks[id], exports);
  let result = exports.default();
  assert.equal(result.type, Redirect);
  assert.deepEqual(result.props.href, {
    pathname: "/required-password",
    params: { returnTo: "/reports/new" },
  });
  pathname = "https://outside.example";
  assert.equal(exports.default().props.href.params.returnTo, "/home");
  mustChangePassword = false;
  assert.equal(exports.default().type, Tabs);
});
