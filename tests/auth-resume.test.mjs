import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as authState from "../src/features/auth/auth-state.ts";
import { validatePasswordChange } from "../src/features/profile/profile-state.ts";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
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
const jsx = (type, props, key) => ({ type, props, key });
async function load(file, mocks, expose = "") {
  const exports = {};
  let source = await readFile(new URL("../" + file, import.meta.url), "utf8");
  if (expose)
    source = source.replace(
      "function " + expose + "(",
      "export function " + expose + "(",
    );
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )(
    (id) =>
      mocks[id] ??
      {
        "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
        "./auth-state": authState,
        "@/features/auth/auth-state": authState,
        "@/features/profile/profile-state": { validatePasswordChange },
        "@/components/panelui/button": { Button: "Button" },
        "@/components/panelui/text": { Text: "Text" },
        "@/components/panelui/spinner": { Spinner: "Spinner" },
        "@/features/reports/components/report-page": { ReportPage: "Page" },
        "@/features/profile/profile-ui": {
          ProfileNotice: "Notice",
          useProfileBackGuard: () => () => {},
        },
        "./auth-password-field": { AuthPasswordField: "PasswordField" },
        "react-native": { View: "View" },
        "expo-image": { Image: "Image" },
        "expo-splash-screen": { preventAutoHideAsync() {} },
      }[id] ??
      {},
    exports,
  );
  return exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.footer)];
}
const button = (tree, label) =>
  nodes(tree).find(
    (n) => n.type === "Button" && n.props.accessibilityLabel === label,
  );

async function forcedLogoutFixture(pathname = "/reports/new", params = {}) {
  const h = hooks(),
    reason = deferred(),
    redirects = [],
    messages = [];
  let auth = { session: null, isLoading: false };
  const module = await load(
    "src/app/_layout.tsx",
    {
      react: h.react,
      "expo-router": {
        useRouter: () => ({ replace: (route) => redirects.push(route) }),
        usePathname: () => pathname,
        useGlobalSearchParams: () => params,
      },
      "@/hooks/use-auth-session": { useAuthSession: () => auth },
      "@/services/api": { consumeForcedLogoutReason: () => reason.promise },
      "@/components/panelui/toast": {
        toast: { show: (message) => messages.push(message) },
      },
    },
    "ForcedLogoutRedirect",
  );
  const render = () => {
    h.start();
    module.ForcedLogoutRedirect();
  };
  render();
  h.flush();
  return {
    reason,
    redirects,
    messages,
    render,
    h,
    setAuth(next) {
      auth = next;
    },
  };
}
test("session-ended redirect preserves the local report destination", async () => {
  const f = await forcedLogoutFixture();
  f.reason.resolve("Your session ended.");
  await tick();
  assert.deepEqual(f.redirects, [
    {
      pathname: "/sign-in",
      params: { context: "session-ended", returnTo: "/reports/new" },
    },
  ]);
  assert.equal(f.messages.length, 1);
});
test("late stored logout reason cannot redirect a newly restored session", async () => {
  const f = await forcedLogoutFixture();
  f.setAuth({ session: { user: { id: "restored" } }, isLoading: false });
  f.render(); // The render guard works even before effect cleanup.
  f.reason.resolve("Old reason.");
  await tick();
  assert.equal(f.redirects.length, 0);
  assert.equal(f.messages.length, 0);
  f.h.flush();
});
test("mandatory-route logout retains linking recovery instead of defaulting Home", async () => {
  const f = await forcedLogoutFixture("/required-password", {
    linking: "1",
    returnTo: "/profile/link-account",
  });
  f.reason.resolve("Your session ended.");
  await tick();
  assert.deepEqual(f.redirects[0].params, {
    context: "session-ended",
    returnTo: "/profile/link-account",
    linking: "1",
  });
});
test("forced auth reads fail closed on network uncertainty while ordinary reads retain cache", async () => {
  const h = hooks(),
    cached = { user: { id: "owner", mustChangePassword: false } };
  const data = new Map([
    [
      "auth_session_cache_v1",
      JSON.stringify({ fetchedAt: Date.now(), value: cached }),
    ],
  ]);
  const module = await load("src/context/auth-session-context.ts", {
    react: h.react,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => data.get(key),
      setItem: async (key, value) => data.set(key, value),
      removeItem: async (key) => data.delete(key),
    },
    "@/services/api": {
      ApiRequestError: class extends Error {},
      getAuthToken: async () => "fixture-token",
      getAuthTokenRevision: () => 0,
      clearAuthToken: async () => {},
      apiRequest: async () => {
        throw new Error("Offline");
      },
      subscribeAuthInvalidated: () => () => {},
    },
  });
  h.start();
  const provider = module.AuthSessionProvider({});
  assert.equal(
    await provider.props.value.refreshSession({ forceNetwork: true }),
    null,
  );
  assert.deepEqual(await provider.props.value.refreshSession(), cached);
});
async function requiredFixture({ linking = false, result = "confirmed" } = {}) {
  const h = hooks(),
    routes = [],
    changes = [],
    refreshes = [],
    pendingChange = deferred();
  let session = {
      user: { id: "owner", mustChangePassword: true, sessionMode: "legacy" },
    },
    returnToEmail = false;
  const params = {
    returnTo: linking ? "/profile/link-account" : "/reports/new",
    ...(linking ? { linking: "1" } : {}),
  };
  const module = await load(
    "src/features/auth/required-password-screen.tsx",
    {
      react: h.react,
      "expo-router": {
        useRouter: () => ({
          replace: (route) => routes.push(route),
          push() {},
        }),
        useLocalSearchParams: () => params,
        useFocusEffect: (fn) => h.react.useEffect(fn, []),
      },
      "@/hooks/use-auth-session": {
        useAuthSession: () => ({
          session,
          isLoading: false,
          refreshSession: async (options) => {
            refreshes.push(options);
            if (result === "uncertain") return null;
            if (result === "other")
              return { user: { id: "other", mustChangePassword: false } };
            session = { user: { ...session.user, mustChangePassword: false } };
            return session;
          },
          signOut: async () => {
            session = null;
          },
        }),
      },
      "@/services/auth": {
        changeConsumerPassword: (...args) => {
          changes.push(args);
          return pendingChange.promise;
        },
      },
    },
    "RequiredPasswordForm",
  );
  function render() {
    h.start();
    return module.RequiredPasswordForm({
      returnToEmail,
      onReturnToEmail: () => {
        returnToEmail = true;
      },
    });
  }
  let page = render();
  h.flush();
  for (const [label, value] of [
    ["Temporary password", "temporary"],
    ["New password", "new-secret"],
    ["Confirm password", "new-secret"],
  ])
    nodes(page)
      .find((n) => n.type === "PasswordField" && n.props.label === label)
      .props.onChangeText(value);
  page = render();
  return {
    page,
    render,
    pendingChange,
    routes,
    changes,
    refreshes,
    setResult(next) {
      result = next;
    },
    setSession(next) {
      session = next;
    },
  };
}
test("mandatory password success clears secrets and waits on Continue after fresh same-principal confirmation", async () => {
  const f = await requiredFixture();
  const submit = button(f.page, "Update password");
  submit.props.onPress();
  submit.props.onPress();
  assert.deepEqual(f.changes, [["temporary", "new-secret"]]);
  assert.ok(
    nodes(f.render())
      .filter((n) => n.type === "PasswordField")
      .every((n) => n.props.value === ""),
  );
  f.pendingChange.resolve();
  await tick();
  const success = f.render();
  assert.equal(success.props.title, "Password updated");
  assert.deepEqual(f.refreshes, [{ forceNetwork: true }]);
  assert.equal(f.routes.length, 0);
  button(success, "Continue").props.onPress();
  assert.deepEqual(f.routes, ["/reports/new"]);
});
test("accepted password change with uncertain refresh stays retryable without repeating the mutation", async () => {
  const f = await requiredFixture({ result: "uncertain" });
  button(f.page, "Update password").props.onPress();
  f.pendingChange.resolve();
  await tick();
  const pending = f.render();
  assert.equal(pending.props.title, "Secure your account");
  assert.ok(button(pending, "Confirm session"));
  assert.equal(f.routes.length, 0);
  f.setResult("confirmed");
  button(pending, "Confirm session").props.onPress();
  await tick();
  assert.equal(f.render().props.title, "Password updated");
  assert.equal(f.changes.length, 1);
});
test("another principal cannot confirm the password mutation", async () => {
  const f = await requiredFixture({ result: "other" });
  button(f.page, "Update password").props.onPress();
  f.pendingChange.resolve();
  await tick();
  const page = f.render();
  assert.equal(page.props.title, "Secure your account");
  assert.equal(button(page, "Continue"), undefined);
  assert.equal(f.routes.length, 0);
});
test("linking completion signs out of the target account before email sign-in", async () => {
  const f = await requiredFixture({ linking: true });
  button(f.page, "Update password").props.onPress();
  f.pendingChange.resolve();
  await tick();
  button(f.render(), "Continue").props.onPress();
  await tick();
  assert.deepEqual(f.routes, [
    {
      pathname: "/sign-in",
      params: {
        mode: "email",
        context: "current",
        returnTo: "/profile/link-account",
      },
    },
  ]);
  const guest = f.render();
  assert.equal(guest.props.href.params.mode, "email");
  assert.equal(guest.props.href.params.returnTo, "/profile/link-account");
  assert.equal(guest.props.href.params.linking, undefined);
});
async function signInFixture({
  context = "session-ended",
  mode = "account",
  linking = false,
} = {}) {
  const h = hooks(),
    routes = [],
    login = deferred(),
    refreshes = [];
  let session = null,
    refreshResult = {
      user: { id: "owner", mustChangePassword: false, sessionMode: "legacy" },
    };
  const InputGroup = Object.assign(function Group() {}, {
    Input: "Input",
    Prefix: "Prefix",
    Suffix: "Suffix",
  });
  const Label = Object.assign(function Label() {}, { Text: "LabelText" });
  const module = await load(
    "src/features/auth/sign-in-screen.tsx",
    {
      react: h.react,
      "react-native": {
        View: "View",
        Pressable: "Pressable",
        StyleSheet: { create: (styles) => styles },
      },
      "expo-router": {
        useRouter: () => ({
          replace: (route) => routes.push(route),
          push: (route) => routes.push(route),
          canGoBack: () => false,
        }),
      },
      "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardAwareScrollView" },
      "react-native-safe-area-context": {
        useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
      },
      "@/context/visual-preview-context": {
        useVisualPreview: () => ({ setFixtures() {}, setGuestFixtures() {} }),
      },
      "@/hooks/use-theme": { useTheme: () => ({ theme: "light" }) },
      "@/hooks/use-app-colors": {
        useAppColors: () => ["#161a1d", "#ffffff", "#66737d", "#ffffff", "#d8dee7"],
      },
      "@/hooks/use-auth-session": {
        useAuthSession: () => ({
          session,
          isLoading: false,
          refreshSession: async () => {
            refreshes.push(true);
            session = refreshResult;
            render();
            return refreshResult;
          },
        }),
      },
      "@/services/auth": {
        signInWithAccountNumber: () => login.promise,
        signInWithEmail: () => login.promise,
      },
      "@/components/panelui/input-group": { InputGroup },
      "@/components/panelui/label": { Label },
    },
    "SignInForm",
  );
  const intent = authState.signInIntent({
    mode,
    context,
    returnTo: "/reports/new",
    ...(linking ? { linking: "1" } : {}),
  });
  const render = () => {
    h.start();
    return module.SignInForm({ intent });
  };
  let page = render();
  h.flush();
  return {
    page,
    render,
    login,
    routes,
    refreshes,
    setSession(next) {
      session = next;
    },
    setRefresh(next) {
      refreshResult = next;
    },
  };
}
test("session-ended methods open the themed resume form and preserve destination through help", async () => {
  const f = await signInFixture();
  assert.ok(nodes(f.page).some(n => n.type === "Text" && n.props.accessibilityRole === "header" && n.props.children === "Sign in to continue"));
  assert.equal(nodes(f.page).some(n => n.type === "Page"), false);
  button(f.page, "Sign in with email").props.onPress();
  const resumed = f.render();
  assert.ok(nodes(resumed).some(n => n.type === "Text" && n.props.accessibilityRole === "header" && n.props.children === "Resume your report"));
  assert.ok(
    nodes(resumed).find(
      (n) =>
        n.type === "Input" && n.props.accessibilityLabel === "Email address",
    ),
  );
  button(resumed, "Need help signing in?").props.onPress();
  assert.deepEqual(f.routes, [
    {
      pathname: "/sign-in-help",
      params: {
        mode: "email",
        context: "session-ended",
        returnTo: "/reports/new",
      },
    },
  ]);
});
test("late sign-in confirmation cannot navigate a different restored principal", async () => {
  const f = await signInFixture();
  button(f.page, "Sign in with account number").props.onPress();
  let page = f.render();
  for (const [label, value] of [
    ["Account number", "001"],
    ["Password", "secret"],
  ])
    nodes(page)
      .find((n) => n.type === "Input" && n.props.accessibilityLabel === label)
      .props.onChangeText(value);
  page = f.render();
  button(page, "Sign in").props.onPress();
  assert.equal(
    nodes(f.render()).find(
      (n) => n.type === "Input" && n.props.accessibilityLabel === "Password",
    ).props.value,
    "",
  );
  f.setSession({ user: { id: "other", mustChangePassword: false } });
  f.render();
  f.login.resolve({ user: { id: "owner" } });
  await tick();
  assert.equal(f.routes.length, 0);
  assert.equal(
    f.refreshes.length,
    0,
    "late login must not refresh the shared session",
  );
  assert.equal(
    f.render().props.href,
    "/reports/new",
    "the newer principal remains signed in",
  );
});
test("loss of a mandatory session keeps the sign-in return target", async () => {
  const f = await requiredFixture();
  f.setSession(null);
  const guest = f.render();
  assert.deepEqual(guest.props.href, {
    pathname: "/sign-in",
    params: { mode: "account", context: "current", returnTo: "/reports/new" },
  });
});
test("a password response arriving after principal change cannot refresh or confirm the previous account", async () => {
  const f = await requiredFixture();
  button(f.page, "Update password").props.onPress();
  f.setSession({
    user: { id: "other", mustChangePassword: true, sessionMode: "legacy" },
  });
  f.render();
  f.pendingChange.resolve();
  await tick();
  assert.equal(f.refreshes.length, 0);
  assert.equal(f.routes.length, 0);
  assert.equal(button(f.render(), "Continue"), undefined);
});
test("signing out from mandatory auth retains the requested destination", async () => {
  const f = await requiredFixture();
  f.page.props.onBack();
  await tick();
  assert.deepEqual(f.routes, [
    {
      pathname: "/sign-in",
      params: { mode: "account", context: "current", returnTo: "/reports/new" },
    },
  ]);
});
test("sign-in help preserves legacy linking context when changing method", async () => {
  const h = hooks(),
    routes = [];
  const module = await load("src/features/auth/sign-in-help-screen.tsx", {
    react: h.react,
    "react-native": { View: "View", Pressable: "Pressable" },
    "expo-router": {
      useRouter: () => ({
        replace: (route) => routes.push(route),
        canGoBack: () => false,
      }),
      useLocalSearchParams: () => ({ linking: "1" }),
    },
    "@/hooks/use-app-colors": { useAppColors: () => ["#006bb8"] },
    "@/hooks/use-auth-session": {
      useAuthSession: () => ({ session: null, signOut: async () => {} }),
    },
  });
  h.start();
  const page = module.default();
  h.flush();
  nodes(page)
    .find(
      (n) =>
        n.type === "Pressable" &&
        n.props.accessibilityLabel === "Use another sign-in method",
    )
    .props.onPress();
  await tick();
  assert.deepEqual(routes, [
    {
      pathname: "/sign-in",
      params: {
        mode: "email",
        context: "new",
        returnTo: "/profile/link-account",
        linking: "1",
      },
    },
  ]);
});

test("a session response for an older token cannot publish or cache a principal", async () => {
  const h = hooks(),
    pending = deferred(),
    data = new Map();
  let revision = 0;
  const module = await load("src/context/auth-session-context.ts", {
    react: h.react,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => data.get(key),
      setItem: async (key, value) => data.set(key, value),
      removeItem: async (key) => data.delete(key),
    },
    "@/services/api": {
      ApiRequestError: class extends Error {},
      getAuthToken: async () => "fixture-token",
      getAuthTokenRevision: () => revision,
      clearAuthToken: async () => {},
      apiRequest: () => pending.promise,
      subscribeAuthInvalidated: () => () => {},
    },
  });
  const render = () => {
    h.start();
    return module.AuthSessionProvider({});
  };
  const request = render().props.value.refreshSession({ forceNetwork: true });
  await tick();
  revision++;
  pending.resolve({ user: { id: "old-owner" } });
  assert.equal(await request, null);
  assert.equal(render().props.value.session, null);
  assert.equal(data.has("auth_session_cache_v1"), false);
});


test("sign-in contexts have one centered heading and no appbar while preserving both methods", async () => {
  for (const context of ["new", "current", "new-device", "returning"]) {
    for (const mode of ["account", "email"]) {
      const f = await signInFixture({ context, mode });
      assert.equal(button(f.page, "Back"), undefined, context + ": no appbar");
      assert.equal(nodes(f.page).filter(n => n.type === "Text" && n.props.accessibilityRole === "header").length, 1);
      assert.ok(button(f.page, "Sign in with account number"));
      assert.ok(button(f.page, "Sign in with email"));
      assert.ok(button(f.page, "Explore as a guest"));
      assert.equal(button(f.page, "Forgot password?").props.style.alignSelf, "center");
      const scroll = nodes(f.page).find(n => n.type === "KeyboardAwareScrollView");
      assert.equal(scroll.props.showsVerticalScrollIndicator, false);
      assert.equal(scroll.props.contentContainerStyle.flat().find(s => s.justifyContent)?.justifyContent, "center");
    }
  }
});

test("sign-in fields keep balanced decorators, subtle borders and clear method switching", async () => {
  const f = await signInFixture({ context: "new" });
  for (const label of ["Account number", "Password"]) {
    const field = nodes(f.page).find(n => n.type === "Input" && n.props.accessibilityLabel === label);
    const styles = field.props.style.flat(Infinity).filter(Boolean);
    assert.equal(styles.find(s => s.borderWidth !== undefined)?.borderWidth, 0.75);
    assert.equal(styles.find(s => s.height !== undefined)?.height, 48);
    field.props.onChangeText(label === "Password" ? "secret" : "001");
  }
  button(f.render(), "Sign in with email").props.onPress();
  const email = f.render();
  assert.ok(nodes(email).some(n => n.type === "Input" && n.props.accessibilityLabel === "Email address" && n.props.value === ""));
  assert.equal(nodes(email).find(n => n.type === "Input" && n.props.accessibilityLabel === "Password").props.value, "");
  assert.equal(nodes(email).filter(n => n.type === "Suffix").length, 1);
});
