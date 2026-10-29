import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as selection from "../src/features/accounts/selection.ts";
import * as profileModel from "../src/models/consumer-profile-view.ts";

const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function load(path, mocks) {
  const exports = {};
  const source = await readFile(new URL("../" + path, import.meta.url), "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText)(id => { assert.ok(id in mocks, "Missing mock " + id); return mocks[id]; }, exports);
  return exports;
}
function storage(data = new Map()) {
  return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); }, removeItem: async key => { data.delete(key); }, getAllKeys: async () => [...data.keys()], multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]), multiSet: async pairs => { pairs.forEach(([key, value]) => data.set(key, value)); }, multiRemove: async keys => { keys.forEach(key => data.delete(key)); } };
}
function snapshot(revision = 3, ids = ["one", "two"]) {
  return { identityUserId: "identity", sessionMode: "identity", authorizedServiceAccountIds: ids, defaultServiceAccountId: ids[0] ?? "", accessRevision: revision, capabilities: { emailSetup: true, accountLinking: true, accountNumberLogin: false, mockEmailVerification: false }, accounts: ids.map((id, i) => ({ id, registeredName: "Person " + id, accountNumber: "123" + i, isDefault: i === 0 })), cacheKey: "identity:" + revision };
}
async function cacheFixture(store = storage()) { return { store, cache: await load("src/services/consumer-account-cache.ts", { "@react-native-async-storage/async-storage": store }) }; }
function hooks() {
  const slots = [], effects = []; let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return { react: { createContext: () => ({ Provider: "Provider" }), createElement: (type, props) => ({ type, props }), useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); }, useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; }, useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn }; return slots[i].value; }, useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; }, useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } }, start() { cursor = 0; }, flush() { while (effects.length) effects.shift()(); } };
}
async function providerFixture(cache, fetchSnapshot = async () => snapshot()) {
  const h = hooks(); let session = { user: { id: "identity" }, session: { id: "session", expiresAt: "2099-01-01" } };
  const module = await load("src/context/consumer-account-context.tsx", { react: h.react, "@/hooks/use-auth-session": { useAuthSession: () => ({ session, isLoading: false }) }, "@/features/accounts/selection": selection, "@/services/consumer-identity": { fetchConsumerAccountContext: fetchSnapshot }, "@/services/consumer-account-cache": cache, "@/hooks/use-consumer-profile": { warmConsumerProfileCache: async () => {}, clearConsumerProfileCaches: async () => {} }, "@/services/reports": { fetchComplaintMeta: async () => {} } });
  return { setSession(value) { session = value; }, render() { h.start(); return module.ConsumerAccountProvider({}).props.value; }, flush: h.flush };
}

test("validated linked-account snapshots survive a cold restart and stay principal scoped", async () => {
  const { cache, store } = await cacheFixture();
  assert.equal(typeof cache.writeConsumerAccountCache, "function", "persistent account snapshots are missing");
  await cache.writeConsumerAccountCache("identity", snapshot(), 1000);
  const restarted = (await cacheFixture(store)).cache;
  assert.deepEqual(await restarted.readConsumerAccountCache("identity", 2000), snapshot());
  assert.equal(await restarted.readConsumerAccountCache("other", 2000), null);
});

test("cache rejects corrupt, mismatched, expired and inconsistent snapshots", async () => {
  const { cache, store } = await cacheFixture();
  assert.equal(typeof cache.writeConsumerAccountCache, "function");
  await cache.writeConsumerAccountCache("identity", snapshot(), 1000);
  const [key, raw] = [...store.data][0];
  for (const value of ["{", JSON.stringify({ ...JSON.parse(raw), principalId: "other" }), JSON.stringify({ ...JSON.parse(raw), value: { ...snapshot(), defaultServiceAccountId: "absent" } }), JSON.stringify({ ...JSON.parse(raw), version: 99 })]) {
    store.data.set(key, value); assert.equal(await cache.readConsumerAccountCache("identity", 2000), null);
  }
  store.data.set(key, raw);
  assert.equal(await cache.readConsumerAccountCache("identity", 31 * 86400000), null);
  assert.equal(await cache.readConsumerAccountCache("identity", 999), null);
});

test("clearing snapshots defeats a pending read and keeps queued work intact", async () => {
  const { cache, store } = await cacheFixture(); assert.equal(typeof cache.writeConsumerAccountCache, "function");
  await cache.writeConsumerAccountCache("identity", snapshot(), 1000);
  store.data.set("report_queue_v1", "original evidence and owner");
  const pause = deferred(), originalRead = store.getItem; store.getItem = async key => { const value = await originalRead(key); await pause.promise; return value; };
  const pending = cache.readConsumerAccountCache("identity", 2000); await tick();
  await cache.clearConsumerAccountCache("identity"); pause.resolve();
  assert.equal(await pending, null); assert.equal(store.data.get("report_queue_v1"), "original evidence and owner");
});

test("a cold offline context hydrates both linked accounts before the failed refresh", async () => {
  const { cache } = await cacheFixture(); assert.equal(typeof cache.writeConsumerAccountCache, "function");
  await cache.writeConsumerAccountCache("identity", snapshot());
  const request = deferred(), f = await providerFixture(cache, () => request.promise);
  f.render(); f.flush(); await tick();
  assert.deepEqual(f.render().accountContext.authorizedServiceAccountIds, ["one", "two"]);
  assert.equal(f.render().isLoading, false); assert.equal(f.render().isCached, true);
  request.reject(new TypeError("Network unavailable")); await tick();
  assert.equal(f.render().accountContext.accessRevision, 3); assert.equal(f.render().isStale, true);
});

test("fresh empty state replaces saved accounts and explicit denial clears them", async () => {
  const { cache } = await cacheFixture(); assert.equal(typeof cache.writeConsumerAccountCache, "function");
  await cache.writeConsumerAccountCache("identity", snapshot());
  let response = snapshot(4, []); const f = await providerFixture(cache, async () => response);
  f.render(); f.flush(); await tick();
  assert.deepEqual(f.render().accountContext.accounts, []); assert.deepEqual((await cache.readConsumerAccountCache("identity")).accounts, []);
  response = null;
  const denied = await providerFixture(cache, async () => { throw Object.assign(new Error("Revoked"), { status: 403 }); });
  denied.render(); denied.flush(); await tick();
  assert.equal(denied.render().accountContext, null); assert.equal(await cache.readConsumerAccountCache("identity"), null);
});

test("principal switch and invalidating refresh reject late snapshots and stale restoration", async () => {
  const { cache } = await cacheFixture(); assert.equal(typeof cache.writeConsumerAccountCache, "function");
  await cache.writeConsumerAccountCache("identity", snapshot());
  const requests = [], f = await providerFixture(cache, () => { const request = deferred(); requests.push(request); return request.promise; });
  f.render(); f.flush(); await tick();
  const pending = f.render().refreshConsumerAccount({ invalidate: true }); await tick();
  requests[0].resolve(snapshot(2)); requests[1].reject(new TypeError("Offline"));
  await pending.catch(() => {}); await tick();
  assert.equal(f.render().accountContext, null); assert.equal(await cache.readConsumerAccountCache("identity"), null);
  const late = f.render().refreshConsumerAccount(); await tick();
  f.setSession({ user: { id: "other" }, session: { id: "other-session", expiresAt: "2099-01-01" } });
  assert.equal(f.render().accountContext, null); f.flush();
  requests[2].resolve(snapshot(7)); await late; await tick();
  assert.equal(await cache.readConsumerAccountCache("identity"), null);
  f.setSession(null); assert.equal(f.render().accountContext, null); f.flush();
  requests[3].resolve({ ...snapshot(8), identityUserId: "other", cacheKey: "other:8" }); await tick();
  assert.equal(await cache.readConsumerAccountCache("other"), null);
});

test("same-session refreshes coalesce instead of racing access revisions", async () => {
  const { cache } = await cacheFixture(); assert.equal(typeof cache.readConsumerAccountCache, "function");
  let calls = 0; const request = deferred(), f = await providerFixture(cache, () => { calls++; return request.promise; });
  f.render(); f.flush(); await tick(); const a = f.render().refreshConsumerAccount(), b = f.render().refreshConsumerAccount();
  request.resolve(snapshot()); await Promise.all([a, b]); assert.equal(calls, 1);
});

test("a session with a newer known access revision never hydrates an older account snapshot", async () => {
  const { cache } = await cacheFixture(); await cache.writeConsumerAccountCache("identity", snapshot());
  const request = deferred(), f = await providerFixture(cache, () => request.promise);
  f.setSession({ user: { id: "identity", identityUserId: "identity", accessRevision: 4 }, session: { id: "new-session", expiresAt: "2099-01-01" } });
  f.render(); f.flush(); await tick();
  assert.equal(f.render().accountContext, null);
  request.resolve(snapshot(4)); await tick();
  assert.equal(f.render().accountContext.accessRevision, 4);
});

test("a later cached access revision remains usable when the retained session metadata lags", async () => {
  const { cache } = await cacheFixture(); await cache.writeConsumerAccountCache("identity", snapshot(4));
  const f = await providerFixture(cache, async () => { throw new TypeError("Offline"); });
  f.setSession({ user: { id: "identity", identityUserId: "identity", accessRevision: 3 }, session: { id: "session", expiresAt: "2099-01-01" } });
  f.render(); f.flush(); await tick();
  assert.equal(f.render().accountContext?.accessRevision, 4);
  f.setSession({ user: { id: "identity", identityUserId: "identity", accessRevision: 4 }, session: { id: "session", expiresAt: "2099-01-01" } });
  f.render(); f.flush(); await tick();
  assert.equal(f.render().accountContext?.accessRevision, 4);
});

test("a clear ordered after an in-flight storage write removes the late persisted snapshot", async () => {
  const { cache, store } = await cacheFixture(), pause = deferred(), set = store.setItem;
  store.setItem = async (key, value) => { await pause.promise; await set(key, value); };
  const write = cache.writeConsumerAccountCache("identity", snapshot()); await tick();
  const clear = cache.clearConsumerAccountCache("identity"); pause.resolve(); await Promise.all([write, clear]);
  assert.equal(await cache.readConsumerAccountCache("identity"), null);
});

test("a cached profile with a transport-only refresh error leaves New report ready", async () => {
  const source = await readFile(new URL("../src/features/reports/new-report-screen.tsx", import.meta.url), "utf8"), ast = ts.createSourceFile("screen.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression; function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "accountReady") expression = node.initializer.getText(ast); ts.forEachChild(node, visit); } visit(ast);
  const evaluate = new Function("scopeCurrent", "metaLoading", "hasCurrentReportContract", "meta", "fixtures", "accountLoading", "profileLoading", "profileError", "profile", "accountId", "isConsumerReadTransportError", "accountContext", "return " + expression);
  const ready = (...args) => evaluate(...args, snapshot());
  const transient = error => error?.status === undefined || error.status >= 500;
  assert.equal(ready(true, false, () => true, {}, false, false, false, new TypeError("Network unavailable"), { profileId: "one" }, "one", transient), true);
  assert.equal(ready(true, false, () => true, {}, false, false, false, Object.assign(new Error("Denied"), { status: 403 }), { profileId: "one" }, "one", transient), false);
  assert.equal(ready(true, false, () => true, {}, false, false, false, new TypeError("Network unavailable"), null, "one", transient), false);
  assert.equal(evaluate(true, false, () => true, {}, false, false, false, null, { profileId: "one" }, "one", transient, null), false);
});

test("default-account changes invalidate access before profile storage cleanup can finish", async () => {
  for (const [path, name] of [["accounts-screen.tsx", "changeDefault"], ["details-screen.tsx", "makeDefault"]]) {
    const source = await readFile(new URL("../src/features/profile/" + path, import.meta.url), "utf8"), ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let node; function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) node = n; ts.forEachChild(n, visit); } visit(ast);
    const compiled = ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const pause = deferred(), invalidations = [], noop = () => {};
    const run = new Function("busy", "defaultId", "id", "setBusy", "setError", "identity", "setAccounts", "setDefaultLinkedAccount", "current", "clearConsumerProfileCaches", "refreshConsumerAccount", "setDefaultId", "setDone", "setDefaultSaved", "setDefaultDialog", compiled + ";return " + name + ";")(false, "two", "two", noop, noop, { fixture: false, account: { accessRevision: 3 } }, noop, async () => {}, () => true, () => pause.promise, async options => invalidations.push(options), noop, noop, noop, noop);
    const pending = run(); await tick();
    assert.deepEqual(invalidations, [{ invalidate: true }], path); pause.resolve(); await pending;
  }
});

async function profileFixture(store, read, initialAccount = snapshot()) {
  const h = hooks(); let session = { user: { id: "identity" } }, accountContext = initialAccount;
  const cache = (await cacheFixture()).cache;
  const module = await load("src/hooks/use-consumer-profile.ts", { react: h.react, "@react-native-async-storage/async-storage": store, "@/hooks/use-auth-session": { useAuthSession: () => ({ session }) }, "@/hooks/use-consumer-account": { useConsumerAccount: () => ({ accountContext }) }, "@/models/consumer-profile-view": profileModel, "@/services/profile": { fetchCurrentConsumerProfileView: read }, "@/services/consumer-account-cache": cache });
  return { module, render() { h.start(); return module.useConsumerProfile(); }, flush: h.flush, logout() { session = null; }, rejectAccounts() { accountContext = null; } };
}
const profile = { profileId: "one", fullName: "Cached person", accountNumber: "1230", isActive: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") };
test("profile warm reads survive restart; denial removes private data while network failure retains it", async () => {
  const store = storage(), scope = { serviceAccountId: "one", accessRevision: 3 };
  const online = await profileFixture(store, async () => profile);
  assert.equal(typeof online.module.warmConsumerProfileCache, "function");
  await online.module.warmConsumerProfileCache("identity", "identity", scope);
  let failure = new TypeError("Offline");
  const offline = await profileFixture(store, async () => { throw failure; });
  offline.render(); offline.flush(); await tick();
  assert.equal(offline.render().profile.fullName, "Cached person");
  await offline.render().reload({ forceNetwork: true });
  assert.equal(offline.render().profile.fullName, "Cached person");
  failure = Object.assign(new Error("Revoked"), { status: 403 });
  await offline.render().reload({ forceNetwork: true });
  assert.equal(offline.render().profile, null);
  assert.equal([...store.data.keys()].filter(key => key.startsWith("profile_cache_payload")).length, 0);
});
test("profile invalidation prevents a late warm read from repopulating private caches", async () => {
  const store = storage(), request = deferred(), f = await profileFixture(store, () => request.promise);
  assert.equal(typeof f.module.warmConsumerProfileCache, "function");
  const pending = f.module.warmConsumerProfileCache("identity", "identity", { serviceAccountId: "one", accessRevision: 3 });
  await f.module.clearConsumerProfileCaches(); request.resolve(profile); await pending;
  assert.deepEqual([...store.data.keys()], []);
});

test("rejecting legacy account access synchronously hides an otherwise matching cached profile", async () => {
  const store = storage(), f = await profileFixture(store, async () => ({ ...profile, profileId: "identity" }), { ...snapshot(0, ["identity"]), sessionMode: "legacy" });
  await f.module.warmConsumerProfileCache("identity", "identity", { serviceAccountId: "identity", accessRevision: 0 });
  f.render(); f.flush(); await tick(); assert.equal(f.render().profile.fullName, "Cached person");
  f.rejectAccounts(); assert.equal(f.render().profile, null);
});

test("an expired retained session cannot expose account snapshots during an offline restart", async () => {
  const source = await readFile(new URL("../src/context/auth-session-context.ts", import.meta.url), "utf8"), ast = ts.createSourceFile("auth.ts", source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "readCachedSession");
  const compiled = ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const value = { user: { id: "identity", role: "consumer" }, session: { id: "expired", userId: "identity", expiresAt: "2000-01-01" } };
  const read = new Function("AsyncStorage", "authSessionCacheKey", "authSessionCacheTtlMs", compiled + ";return readCachedSession;")({ getItem: async () => JSON.stringify({ fetchedAt: Date.now(), value }) }, "session", 30 * 86400000);
  assert.equal(await read(), null);
});

test("auth invalidation clears private read snapshots without touching the durable report queue", async () => {
  const source = await readFile(new URL("../src/context/auth-session-context.ts", import.meta.url), "utf8"), ast = ts.createSourceFile("auth.ts", source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "clearCachedSession");
  const compiled = ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const calls = [], data = new Map([["session", "retained"], ["report_queue_v1", "original owner and photos"]]);
  const clear = new Function("AsyncStorage", "authSessionCacheKey", "clearConsumerAccountCache", "clearConsumerProfileCaches", compiled + ";return clearCachedSession;")({ removeItem: async key => data.delete(key) }, "session", async () => { calls.push("accounts"); }, async () => { calls.push("profiles"); });
  await clear(); assert.deepEqual(calls.sort(), ["accounts", "profiles"]); assert.equal(data.get("report_queue_v1"), "original owner and photos");
});

test("private read invalidation starts before a delayed session-cache removal can outlive logout", async () => {
  const source = await readFile(new URL("../src/context/auth-session-context.ts", import.meta.url), "utf8"), ast = ts.createSourceFile("auth.ts", source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "clearCachedSession");
  const compiled = ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const pause = deferred(), calls = [];
  const clear = new Function("AsyncStorage", "authSessionCacheKey", "clearConsumerAccountCache", "clearConsumerProfileCaches", compiled + ";return clearCachedSession;")({ removeItem: () => pause.promise }, "session", async () => { calls.push("accounts"); }, async () => { calls.push("profiles"); });
  const pending = clear(); assert.deepEqual(calls.sort(), ["accounts", "profiles"]); pause.resolve(); await pending;
});
