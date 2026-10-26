import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const tick = () => new Promise((resolve) => setImmediate(resolve));
for (const stage of ["token-clear", "cache-clear"])
  test("sign-out cannot clear a newer session after " + stage + " awaits", async () => {
    const source = await readFile(new URL("../src/context/auth-session-context.ts", import.meta.url), "utf8");
    const ast = ts.createSourceFile("auth.ts", source, ts.ScriptTarget.Latest, true);
    let callback;
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "signOut") callback = node.initializer.arguments[0].getText(ast);
      ts.forEachChild(node, visit);
    }
    visit(ast); assert.ok(callback);
    const pause = deferred(); let revision = 1, changes = 0, cacheClears = 0;
    const compiled = ts.transpileModule("const handler = " + callback + "; return handler;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const signOut = new Function("authGeneration", "getAuthTokenRevision", "getAuthToken", "apiRequest", "clearAuthToken", "clearCachedSession", "setSession", compiled)(
      { current: 0 }, () => revision, async () => "old-token", async () => {},
      async () => { revision++; if (stage === "token-clear") await pause.promise; },
      async () => { cacheClears++; if (stage === "cache-clear") await pause.promise; },
      () => changes++,
    );
    const pending = signOut(); await tick(); revision++; pause.resolve(); await pending;
    assert.equal(changes, 0); assert.equal(cacheClears, stage === "cache-clear" ? 1 : 0);
  });
function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}
async function load(path, mocks) {
  const exports = {};
  const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
  )((id) => {
    if (!(id in mocks)) throw new Error("Missing mock: " + id);
    return mocks[id];
  }, exports);
  return exports;
}
async function fixture(os = "web") {
  const data = new Map(),
    secureData = new Map(),
    request = deferred();
  let pauseWrite;
  const storage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      if (key === "aleconnect_auth_token_v1") await pauseWrite?.promise;
      data.set(key, value);
    },
    removeItem: async (key) => data.delete(key),
  };
  const api = await load("src/services/api.ts", {
    "@react-native-async-storage/async-storage": storage,
    "expo-secure-store": {
      getItemAsync: async (key) => secureData.get(key) ?? null,
      setItemAsync: async (key, value) => {
        await pauseWrite?.promise;
        secureData.set(key, value);
      },
      deleteItemAsync: async (key) => secureData.delete(key),
      AFTER_FIRST_UNLOCK: "fixture",
    },
    "react-native": { Platform: { OS: os } },
    "@/constants": { aleconnectApiBaseUrl: "https://fixture.invalid" },
    "@/utils/rate-limit": {isRateLimit:(status,code)=>status===429||/RATE_LIMIT|TOO_MANY|ATTEMPTS_EXCEEDED/.test(code??''),RATE_LIMIT_MESSAGE:'Too many requests. Try again later.'},
    "@/utils/http-retry": { shouldRetryHttpRequest: () => false },
    "@/utils/report-transport": {
      requestPhaseFailureMessage: () => "Request failed",
    },
  });
  const auth = await load("src/services/auth.ts", {
    "@react-native-async-storage/async-storage": storage,
    "@/services/api": { ...api, apiRequest: async () => request.promise },
  });
  return {
    api,
    auth,
    request,
    pause() {
      pauseWrite = deferred();
      return pauseWrite;
    },
    data,
  };
}
for (const mode of ["account", "email"])
  test(mode + " late login cannot overwrite a newer token", async () => {
    const f = await fixture();
    const pending =
      mode === "account"
        ? f.auth.signInWithAccountNumber({
            accountNumber: "001",
            password: "fixture",
          })
        : f.auth.signInWithEmail({
            email: "one@example.invalid",
            password: "fixture",
          });
    await tick();
    await f.api.setAuthToken("newer-fixture-token");
    f.request.resolve({
      token: "late-fixture-token",
      user: { role: "consumer" },
    });
    await assert.rejects(pending, /Account access changed/);
    assert.equal(await f.api.getAuthToken(), "newer-fixture-token");
  });
test("unmounted login does not install its token", async () => {
  const f = await fixture();
  let mounted = true;
  const pending = f.auth.signInWithEmail(
    { email: "one@example.invalid", password: "fixture" },
    () => mounted,
  );
  mounted = false;
  f.request.resolve({
    token: "late-fixture-token",
    user: { role: "consumer" },
  });
  await assert.rejects(pending, /Account access changed/);
  assert.equal(await f.api.getAuthToken(), null);
});
test("a rejected non-consumer login preserves a newer consumer token", async () => {
  const f = await fixture();
  const pending = f.auth.signInWithEmail({
    email: "one@example.invalid",
    password: "fixture",
  });
  await f.api.setAuthToken("newer-fixture-token");
  f.request.resolve({ token: "staff-fixture-token", user: { role: "staff" } });
  await assert.rejects(pending, /only supports consumer/);
  assert.equal(await f.api.getAuthToken(), "newer-fixture-token");
});
for (const os of ["web", "android"])
  test(
    os + " token writes preserve later sign-out and login order",
    async () => {
      const f = await fixture(os),
        pause = f.pause();
      const write = f.api.setAuthToken("old-fixture-token");
      const rejected = assert.rejects(write, /Account access changed/);
      await tick();
      const clear = f.api.clearAuthToken();
      const newer = f.api.setAuthToken("newer-fixture-token");
      pause.resolve();
      await Promise.all([rejected, clear, newer]);
      assert.equal(await f.api.getAuthToken(), "newer-fixture-token");
    },
  );
test("login unmounted during secure storage cannot leave a token behind", async () => {
  const f = await fixture("android"),
    pause = f.pause();
  let mounted = true;
  const write = f.api.setAuthToken("fixture-token", {
    expectedRevision: f.api.getAuthTokenRevision(),
    isCurrent: () => mounted,
  });
  const rejected = assert.rejects(write, /Account access changed/);
  await tick();
  mounted = false;
  pause.resolve();
  await rejected;
  assert.equal(await f.api.getAuthToken(), null);
});
test("a stale request's 401 cannot invalidate a newer login", async () => {
  const f = await fixture(),
    response = deferred();
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => response.promise;
  try {
    await f.api.setAuthToken("old-fixture-token");
    let invalidations = 0;
    f.api.subscribeAuthInvalidated(() => invalidations++);
    const request = f.api.apiRequest(
      "/private",
      {},
      { authToken: "old-fixture-token" },
    );
    const rejected = assert.rejects(request, /Expired/);
    await f.api.setAuthToken("newer-fixture-token");
    response.resolve(
      new Response(JSON.stringify({ error: "Expired" }), { status: 401 }),
    );
    await rejected;
    assert.equal(await f.api.getAuthToken(), "newer-fixture-token");
    assert.equal(invalidations, 0);
    assert.equal(f.data.has("aleconnect_forced_logout_reason_v1"), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
