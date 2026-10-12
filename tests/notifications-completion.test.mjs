import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
function evaluate(code, modules) {
  const exports = {};
  new Function("require", "exports", ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)((name) => {
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}
const timing = evaluate(await source("src/utils/manila-time.ts"), {});
const presentation = evaluate(await source("src/features/notifications/presentation.ts"), { "../../utils/manila-time.ts": timing });
const { notificationFixtureAccount: account, notificationFixtures: rows, notificationFixtureNow: now } = evaluate(await source("src/features/notifications/fixtures.ts"), {});
const { groupNotifications, notificationRoute, notificationIsAuthorized, findOwnNotification, mergeNotificationPages, matchesNotification } = presentation;

test("date groups use Manila boundaries and searching includes masked account/report context", () => {
  const groups = groupNotifications(rows, now);
  assert.deepEqual(groups.map((group) => group.title), ["Today", "Yesterday", "This week", "Last weekend"]);
  assert.ok(groups[0].data.some((row) => row.id === "fixture-link"));
  assert.ok(matchesNotification(rows[2], "1042"));
  assert.ok(matchesNotification(rows[2], "4821"));
  assert.equal(matchesNotification(rows[2], "nonexistent"), false);
});

test("destinations preserve real report/advisory/request flows and reject revoked account rows", () => {
  assert.equal(notificationRoute(rows[0], account).pathname, "/advisory/[id]");
  assert.deepEqual(notificationRoute(rows[2], account).params, { id: "fixture-1", serviceAccountId: "fixture-home", focus: "notification" });
  assert.equal(notificationRoute(rows[3], account).pathname, "/profile/link-requests");
  assert.deepEqual(notificationRoute(rows.at(-1), account), { pathname: "/notification", params: { id: "fixture-message" } });
  const revoked = { ...rows[2], serviceAccountId: "former-owner" };
  assert.equal(notificationIsAuthorized(revoked, account), false);
  assert.equal(notificationRoute(revoked, account), null);
  assert.equal(notificationRoute({ ...rows[2], serviceAccountId: null }, account).pathname, "/notification");
  assert.equal(notificationRoute({ ...rows[2], serviceAccountId: null }, { ...account, sessionMode: "legacy", authorizedServiceAccountIds: ["fixture-home"] }).pathname, "/reports/[id]");
});

test("message lookup only returns an authoritative own-inbox row and stops stale/repeated pagination", async () => {
  const called = [];
  const result = await findOwnNotification("fixture-message", async (cursor) => {
    called.push(cursor);
    return cursor ? { notifications: [rows.at(-1)], nextCursor: null } : { notifications: [rows[0]], nextCursor: "older" };
  }, () => true);
  assert.equal(result.item.title, "Service update");
  assert.deepEqual(called, [null, "older"]);
  await assert.rejects(findOwnNotification("foreign", async () => ({ notifications: [], nextCursor: "repeat" }), () => true), /Notifications changed/);
  await assert.rejects(findOwnNotification("foreign", async () => ({ notifications: [], nextCursor: "more", isStale: true }), () => true), /not in the saved inbox/);
  let current = true;
  const late = await findOwnNotification("fixture-message", async () => { current = false; return { notifications: [rows.at(-1)], nextCursor: "more" }; }, () => current);
  assert.equal(late.item, null);
  const merged = mergeNotificationPages({ notifications: [rows[0]], nextCursor: "old" }, { notifications: [{ ...rows[0], isRead: true }, rows[1]], nextCursor: null });
  assert.equal(merged.notifications.length, 2);
  assert.equal(merged.notifications[0].isRead, true);
});

async function serviceHarness(request, readKeys) {
  const storage = new Map();
  const removed = [];
  class ApiRequestError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const service = evaluate(await source("src/services/notifications.ts"), {
    "@react-native-async-storage/async-storage": { __esModule: true, default: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      getAllKeys: async () => readKeys ? readKeys([...storage.keys()]) : [...storage.keys()],
      multiRemove: async (keys) => { removed.push(...keys); keys.forEach((key) => storage.delete(key)); },
    } },
    "@/services/api": { apiRequest: request, ApiRequestError },
    "@/utils/refresh-cooldown": { claimRefresh: () => true },
  });
  return { ...service, storage, removed };
}
const options = { userId: "legacy-principal", identityUserId: "identity", accessRevision: 4, sessionId: "session-1" };
const response = { notifications: [rows[0]], unreadCount: 1, nextCursor: null, accessRevision: 4 };

test("401/403/409 and revision mismatches never fall back to a private notification cache", async () => {
  for (const status of [401, 403, 409]) {
    let denied = false;
    const h = await serviceHarness(async () => { if (denied) throw Object.assign(new Error("Denied"), { status }); return response; });
    await h.fetchNotifications(options);
    denied = true;
    await assert.rejects(h.fetchNotifications({ ...options, force: true }), /Denied/);
    assert.equal(h.storage.size, 0);
    await assert.rejects(h.fetchNotifications(options), /Denied/);
  }
  const h = await serviceHarness(async () => ({ ...response, accessRevision: 5 }));
  await assert.rejects(h.fetchNotifications(options), /account access changed/);
  assert.equal(h.storage.size, 0);
});

test("network fallback is explicitly stale and cannot cross identity/revision/filter boundaries", async () => {
  let offline = false;
  const h = await serviceHarness(async () => { if (offline) throw new Error("Offline"); return response; });
  await h.fetchNotifications(options);
  offline = true;
  assert.equal((await h.fetchNotifications({ ...options, force: true })).isStale, true);
  for (const scope of [{ identityUserId: "other" }, { accessRevision: 5 }, { serviceAccountId: "other-account" }, { unread: true }]) await assert.rejects(h.fetchNotifications({ ...options, ...scope, force: true }), /Offline/);
});

test("late read completions cannot persist old-session rows or invalidate another identity/revision", async () => {
  let current = true, resolve;
  const pending = new Promise((done) => { resolve = done; });
  const h = await serviceHarness(() => pending);
  const read = h.fetchNotifications({ ...options, isCurrent: () => current });
  await new Promise((done) => setImmediate(done));
  current = false;
  resolve(response);
  await assert.rejects(read, /Account access changed/);
  assert.equal(h.storage.size, 0);
});

test("read writes are confirmed before invalidation, scope the canonical identity, and ignore late sessions", async () => {
  let resolve;
  const calls = [];
  const h = await serviceHarness((path, init) => { calls.push({ path, body: JSON.parse(init.body) }); return new Promise((done) => { resolve = done; }); });
  const key = "notification_list_cache_v3:identity:4:all";
  h.storage.set(key, "private");
  h.storage.set("notification_list_cache_v3:identity:5:all", "new revision");
  h.storage.set("notification_list_cache_v3:other:4:all", "other identity");
  const write = h.markNotificationsRead([rows[0].id], options.userId, { identityUserId: "identity", accessRevision: 4, serviceAccountId: "fixture-home", isCurrent: () => true });
  assert.equal(h.storage.has(key), true);
  assert.equal(calls[0].body.accessRevision, 4);
  assert.match(calls[0].path, /serviceAccountId=fixture-home/);
  resolve(response);
  await write;
  assert.equal(h.storage.has(key), false);
  assert.equal(h.storage.size, 2);
  h.storage.set(key, "keep");
  let current = true;
  const late = h.markAllNotificationsRead(options.userId, { identityUserId: "identity", accessRevision: 4, isCurrent: () => current });
  current = false;
  resolve(response);
  await late;
  assert.equal(h.storage.has(key), true);
});

test("failed read writes retain cached unread state and never emit success invalidation", async () => {
  const h = await serviceHarness(async () => { throw new Error("Write failed"); });
  h.storage.set("notification_list_cache_v3:identity:4:all", "unread");
  let changed = 0;
  h.subscribeNotificationsChanged(() => changed++);
  await assert.rejects(h.markAllNotificationsRead(options.userId, { identityUserId: "identity", accessRevision: 4 }), /Write failed/);
  assert.equal(h.storage.size, 1);
  assert.equal(changed, 0);
});

test("cache invalidation rechecks the session after asynchronous storage discovery", async () => {
  let release, current = true;
  const h = await serviceHarness(async () => response, (keys) => new Promise((done) => { release = () => done(keys); }));
  const key = "notification_list_cache_v3:identity:4:all";
  h.storage.set(key, "new session snapshot");
  const pending = h.markAllNotificationsRead(options.userId, { identityUserId: "identity", accessRevision: 4, isCurrent: () => current });
  await new Promise((done) => setImmediate(done));
  current = false;
  release();
  await pending;
  assert.equal(h.storage.has(key), true);
});

async function notificationHookHarness({ fixture = false, preview = false, mark = async () => response } = {}) {
  const slots = [];
  let cursor = 0, writes = 0, reloads = 0, current = true;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }); },
    useEffect() {},
  };
  const access = { fixtures: fixture, key: "session-1:identity:4", account, isCurrent: () => current, options: { ...options, isCurrent: () => current } };
  const hook = evaluate(await source("src/features/notifications/use-notifications.ts"), {
    react,
    "@/hooks/use-auth-session": {}, "@/hooks/use-consumer-account": {}, "@/context/visual-preview-context": {},
    "@/hooks/use-scoped-read": { useScopedRead: () => ({ data: response, busy: false, reload: async () => { reloads++; } }) },
    "@/constants/panelui-preview": { PANELUI_PREVIEW: preview },
    "@/services/notifications": { markNotificationsRead: async (...args) => { writes++; return mark(...args); }, markAllNotificationsRead: async (...args) => { writes++; return mark(...args); } },
    "./fixtures": { notificationFixtureAccount: account, notificationFixtures: rows },
    "./presentation": presentation,
  });
  return {
    render(category = "all") { cursor = 0; return hook.useNotifications(access, category, "all", false); },
    invalidate() { current = false; },
    get writes() { return writes; }, get reloads() { return reloads; },
  };
}

test("pending read actions reject duplicates and a filter replacement cannot commit their result", async () => {
  let resolve;
  const h = await notificationHookHarness({ mark: () => new Promise((done) => { resolve = done; }) });
  const first = h.render().mutate(rows[0]);
  assert.equal(await h.render().mutate(), false);
  assert.equal(h.writes, 1);
  h.render("system");
  resolve(response);
  assert.equal(await first, false);
  assert.equal(h.reloads, 0);
  assert.equal(h.render("system").mutation.busy, false);
  assert.equal(h.render("system").mutation.notice, "");
});

test("expired identity cannot complete a read action and read-only preview makes no live writes", async () => {
  let resolve;
  const h = await notificationHookHarness({ mark: () => new Promise((done) => { resolve = done; }) });
  const pending = h.render().mutate(rows[0]);
  h.invalidate();
  resolve(response);
  assert.equal(await pending, false);
  assert.equal(h.reloads, 0);
  const preview = await notificationHookHarness({ preview: true });
  assert.equal(await preview.render().mutate(rows[0]), true);
  assert.equal(preview.writes, 0);
  assert.equal(preview.render().mutation.notice, "");
  const fixture = await notificationHookHarness({ fixture: true, preview: true });
  assert.equal(await fixture.render().mutate(), true);
  assert.equal(fixture.writes, 0);
  assert.equal(fixture.render().unreadCount, 0);
});

test("preview and message screens gate live writes and ignore route-supplied message text", async () => {
  const hook = await source("src/features/notifications/use-notifications.ts");
  const detail = await source("src/features/notifications/notification-screen.tsx");
  assert.match(hook, /!access\.fixtures && PANELUI_PREVIEW/);
  assert.match(hook, /session\.session\.id/);
  assert.match(detail, /findOwnNotification/);
  assert.doesNotMatch(detail, /params\.(title|message|description|content)/);
});
