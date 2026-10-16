import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { claimManualRefresh } from "../src/utils/manual-refresh.ts";
import { manualRefreshHarness } from "./manual-refresh-harness.mjs";

test("manual refresh allows three attempts per rolling minute and releases exactly at its boundary", () => {
  const key = "rolling";
  for (const now of [0, 3_000, 6_000]) {
    const claim = claimManualRefresh(key, now);
    assert.equal(claim.allowed, true);
    claim.finish();
  }
  assert.deepEqual(claimManualRefresh(key, 9_000), { allowed: false, pending: false, retryAfterMs: 51_000 });
  assert.equal(claimManualRefresh(key, 59_999).allowed, false);
  const next = claimManualRefresh(key, 60_000);
  assert.equal(next.allowed, true);
  next.finish();
  assert.equal(claimManualRefresh(key, 62_999).allowed, false);
  const afterSecondExpires = claimManualRefresh(key, 63_000);
  assert.equal(afterSecondExpires.allowed, true);
  afterSecondExpires.finish();
});

test("rapid and overlapping attempts are denied without spending another attempt", () => {
  const first = claimManualRefresh("overlap", 0);
  assert.deepEqual(claimManualRefresh("overlap", 60_000), { allowed: false, pending: true, retryAfterMs: 0 });
  first.finish();
  const second = claimManualRefresh("overlap", 60_001);
  second.finish();
  assert.equal(claimManualRefresh("overlap", 61_000).allowed, false);
  const third = claimManualRefresh("overlap", 63_001);
  assert.equal(third.allowed, true);
  third.finish();
  for (const now of [0, 3_000, 6_000]) {
    const claim = claimManualRefresh("rapid", now);
    assert.equal(claim.allowed, true);
    claim.finish();
    assert.equal(claimManualRefresh("rapid", now + 1).allowed, false);
  }
  assert.equal(claimManualRefresh("rapid", 9_000).allowed, false);
});

function hookHarness() {
  const state = [], toasts = [];
  let cursor = 0, now = 0;
  const modules = manualRefreshHarness({
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [state[i], next => { state[i] = typeof next === "function" ? next(state[i]) : next; }];
    },
  }, { now: () => now, onToast: value => toasts.push(value) });
  return {
    toasts, time: value => { now = value; }, remount: () => { state.length = 0; },
    render: (resource, consumer, reload, busy = false) => { cursor = 0; return modules.useManualRefresh(resource, consumer, reload, busy); },
  };
}

test("manual hook keeps quota through remounts and filters while separating resources and consumers", async () => {
  const h = hookHarness();
  let calls = 0;
  const load = async () => { calls++; };
  for (const now of [0, 3_000, 6_000]) { h.time(now); await h.render("reports", "A", load).refresh(); h.remount(); }
  h.time(9_000);
  await h.render("reports", "A", load).refresh();
  assert.equal(calls, 3, "the empty-cache loader is never reached on denial");
  assert.match(h.toasts.at(-1).description, /51 seconds/);
  await h.render("reports", "B", load).refresh();
  await h.render("advisories", "A", load).refresh();
  assert.equal(calls, 5);
});

test("manual hook guards overlap synchronously and finalizes failed requests", async () => {
  const h = hookHarness();
  let reject, calls = 0;
  const load = () => { calls++; return new Promise((_, fail) => { reject = fail; }); };
  const view = h.render("notifications", "A", load);
  const pending = view.refresh();
  await view.refresh();
  assert.equal(calls, 1);
  assert.equal(h.render("notifications", "A", load).refreshing, true);
  reject(new Error("Offline"));
  await assert.rejects(pending, /Offline/);
  assert.equal(h.render("notifications", "A", load).refreshing, false);
  h.time(3_000);
  await h.render("notifications", "A", async () => { calls++; }).refresh();
  assert.equal(calls, 2);
});

test("background reads and absent identities neither spin nor consume manual quota", async () => {
  const h = hookHarness();
  let calls = 0;
  const load = async () => { calls++; };
  const background = h.render("hotlines", "guest", load, true);
  assert.equal(background.refreshing, false);
  await background.refresh();
  await h.render("hotlines", null, load).refresh();
  assert.equal(calls, 0);
  await h.render("hotlines", "guest", load).refresh();
  assert.equal(calls, 1);
});

test("a previous consumer completion cannot hide a new consumer's active pull", async () => {
  const h = hookHarness();
  let finishA, finishB;
  const loadA = () => new Promise(resolve => { finishA = resolve; });
  const loadB = () => new Promise(resolve => { finishB = resolve; });
  const pendingA = h.render("reports", "A", loadA).refresh();
  assert.equal(h.render("reports", "B", loadB).refreshing, false);
  const pendingB = h.render("reports", "B", loadB).refresh();
  finishA();
  await pendingA;
  assert.equal(h.render("reports", "B", loadB).refreshing, true);
  finishB();
  await pendingB;
  assert.equal(h.render("reports", "B", loadB).refreshing, false);
});

test("all manual page recovery and pull paths use the shared resource guard", async () => {
  for (const [resource, names] of [
    ["hotlines", ["hotlines-screen", "directory-screen"]],
    ["notifications", ["notifications-screen", "notification-screen"]],
    ["advisories", ["advisories-screen", "update-detail-screen"]],
    ["reports", ["main-screen", "all-reports-screen", "report-detail-screen"]],
  ]) for (const name of names) {
    const source = await readFile(new URL(`../src/features/${resource}/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`useManualRefresh\\(\\s*"${resource}"`));
    assert.doesNotMatch(source, /onAction=\{\(\) => void (?:data|feed|read|reports)\.reload\(true\)/);
  }
});
