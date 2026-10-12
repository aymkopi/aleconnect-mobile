import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function harness() {
  const values = new Map();
  const calls = [];
  let response = { advisories: [{ id: "public-notice", title: "Public" }], items: [{ kind: "facebook_post", id: "page_post", message: "Public post" }], nextCursor: null };
  class ApiRequestError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const modules = {
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value), removeItem: async (key) => values.delete(key) } },
    "@/services/api": { ApiRequestError, apiRequest: async (path, init, options) => { calls.push({ path, init, options }); if (response instanceof Error) throw response; return response; } },
    "@/utils/refresh-cooldown": { claimRefresh: () => true },
    "@/utils/human-reference": { normalizeHumanReference: (value) => typeof value === "string" ? value : null },
  };
  async function load(name) {
    const source = await readFile(new URL(`../src/services/${name}.ts`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    new Function("require", "module", "exports", code)((path) => { assert.ok(modules[path], `Unexpected import ${path}`); return modules[path]; }, module, module.exports);
    return module.exports;
  }
  const advisories = await load("advisories");
  modules["@/services/advisories"] = advisories;
  const updates = await load("public-updates");
  return { values, calls, advisories, updates, ApiRequestError, respond: (value) => { response = value; } };
}

test("anonymous advisory requests use guest routes without bearer tokens and never read private cache", async () => {
  const h = await harness();
  const privateScope = { userId: "consumer", identityUserId: "identity", accessRevision: 2 };
  const guestScope = { ...privateScope, publicOnly: true };
  h.values.set("active_advisories_cache_v2:identity:2", JSON.stringify({ fetchedAt: Date.now(), limit: 25, value: { advisories: [{ id: "selected-private" }], nextCursor: null } }));
  const result = await h.advisories.fetchActiveAdvisories(guestScope);
  assert.equal(result.advisories[0].id, "public-notice");
  assert.equal(h.calls[0].path, "/api/mobile/public/advisories?limit=25");
  assert.deepEqual(h.calls[0].options, { authToken: null });
  assert.ok(h.values.has("active_advisories_cache_v2:public"));
  assert.equal(h.advisories.advisoryScopeKey(privateScope), "identity:2");
  await h.advisories.fetchActiveAdvisory("notice/id", guestScope);
  assert.equal(h.calls[1].path, "/api/mobile/public/advisories/notice%2Fid");
  assert.deepEqual(h.calls[1].options, { authToken: null });
  await h.advisories.fetchActiveAdvisory("notice", privateScope);
  assert.equal(h.calls[2].path, "/api/mobile/advisories/notice");
  assert.deepEqual(h.calls[2].options, {});
});

test("guest Public Updates and direct post detail use public cache and normalized contract", async () => {
  const h = await harness();
  const scope = { userId: "guest", publicOnly: true };
  await h.updates.fetchPublicUpdates(scope);
  assert.equal(h.calls[0].path, "/api/mobile/public/updates?limit=25");
  assert.deepEqual(h.calls[0].options, { authToken: null });
  assert.ok(h.values.has("public_updates_cache_v1:public"));
  h.respond({ item: { kind: "facebook_post", id: "page_post", message: "Public post", photos: [{ id: "photo", url: "https://example.com/photo.jpg", position: 2 }] } });
  const item = await h.updates.fetchGuestPublicPost("page_post");
  assert.equal(item.photos[0].position, 2);
  assert.equal(h.calls[1].path, "/api/mobile/public/updates/posts/page_post");
  assert.deepEqual(h.calls[1].options, { authToken: null });
  h.respond({ item: { kind: "advisory", id: "notice" } });
  await assert.rejects(h.updates.fetchGuestPublicPost("notice"), /Public post not found/);
});

test("guest feed fallback keeps public scope and auth failures never return private feed cache", async () => {
  const h = await harness();
  const scope = { userId: "guest", publicOnly: true };
  h.respond(new h.ApiRequestError("Unavailable", 404));
  await assert.rejects(h.updates.fetchPublicUpdates(scope));
  assert.deepEqual(h.calls.map((call) => call.path), ["/api/mobile/public/updates?limit=25", "/api/mobile/public/advisories?limit=25"]);
  const privateScope = { userId: "consumer", identityUserId: "identity", accessRevision: 2 };
  h.values.set("public_updates_cache_v1:identity:2", JSON.stringify({ fetchedAt: Date.now(), limit: 25, value: { items: [{ kind: "advisory", id: "private" }], nextCursor: null } }));
  h.respond(new h.ApiRequestError("Unauthorized", 401));
  await assert.rejects(h.updates.fetchPublicUpdates({ ...privateScope, force: true }), /Unauthorized/);
  assert.equal(h.values.has("public_updates_cache_v1:identity:2"), false);
});

for (const denied of [{ status: 401 }, { status: 403, code: 'ACCOUNT_NOT_ACCESSIBLE' }, { status: 409 }, { code: 'STALE_ACCESS_REVISION' }]) test('denied advisory scope clears only its private cache: '+JSON.stringify(denied), async () => {
  const h = await harness(), scope = { userId: 'consumer', identityUserId: 'identity', accessRevision: 2 };
  await h.advisories.fetchActiveAdvisories(scope);
  const key = 'active_advisories_cache_v2:identity:2'; assert.ok(h.values.has(key));
  h.values.set('active_advisories_cache_v2:public', 'preserve public');
  h.values.set('active_advisories_cache_v2:other:2', 'preserve other');
  h.respond(Object.assign(new Error('Access denied'), denied));
  await assert.rejects(() => h.advisories.fetchActiveAdvisories({ ...scope, force: true }), /Access denied/);
  assert.equal(h.values.has(key), false);
  assert.equal(h.values.get('active_advisories_cache_v2:public'), 'preserve public');
  assert.equal(h.values.get('active_advisories_cache_v2:other:2'), 'preserve other');
});
test('offline advisory fetch keeps its labelled public cache fallback', async () => {
  const h = await harness(), scope = { userId: 'guest', publicOnly: true };
  await h.advisories.fetchActiveAdvisories(scope); h.respond(new Error('offline'));
  assert.equal((await h.advisories.fetchActiveAdvisories({ ...scope, force: true })).isStale, true);
});
