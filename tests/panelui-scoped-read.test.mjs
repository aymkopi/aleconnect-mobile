import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
async function harness() {
  const slots = [],
    pending = [];
  let cursor = 0,
    scope,
    read;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(initial) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: initial });
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
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
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps))
        pending.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
    },
  };
  const source = await readFile(
      new URL("../src/hooks/use-scoped-read.ts", import.meta.url),
      "utf8",
    ),
    exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(() => react, exports);
  return {
    render(nextScope = scope, nextRead = read) {
      scope = nextScope;
      read = nextRead;
      cursor = 0;
      const result = exports.useScopedRead(scope, read);
      while (pending.length) pending.shift()();
      return result;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
test("late reader completion cannot paint a changed identity or logged-out screen", async () => {
  const h = await harness(),
    a = deferred(),
    b = deferred();
  h.render("owner:a", () => a.promise);
  assert.equal(h.render("owner:b", () => b.promise).data, null);
  a.resolve({ private: "a" });
  await tick();
  assert.equal(h.render().data, null);
  b.resolve({ private: "b" });
  await tick();
  assert.deepEqual(h.render().data, { private: "b" });
  const late = deferred(),
    request = h.render().append(
      () => late.promise,
      (_, n) => n,
    );
  assert.equal(h.render(null, () => Promise.reject()).data, null);
  late.resolve({ private: "late" });
  await request;
  await tick();
  assert.equal(h.render().data, null);
  h.unmount();
});
test("filter replacement failure keeps old rows and rejects committing new criteria", async () => {
  const h = await harness();
  h.render("owner", async () => ({ rows: ["saved"] }));
  await tick();
  const read = h.render();
  const accepted = await read.append(
    async () => {
      throw new Error("Offline");
    },
    (_, n) => n,
  );
  assert.equal(accepted, false);
  assert.deepEqual(h.render().data, { rows: ["saved"] });
  assert.equal(h.render().error, "Offline");
  h.unmount();
});
test("newer reload wins over late pagination and replacement only commits success", async () => {
  const h = await harness();
  h.render("owner", async () => ({ rows: ["first"] }));
  await tick();
  const page = deferred(),
    old = h.render().append(
      () => page.promise,
      (a, b) => ({ rows: [...a.rows, ...b.rows] }),
    );
  await h.render("owner", async () => ({ rows: ["refreshed"] })).reload(true);
  page.resolve({ rows: ["stale"] });
  assert.equal(await old, false);
  assert.deepEqual(h.render().data, { rows: ["refreshed"] });
  assert.equal(
    await h.render().append(
      async () => ({ rows: ["filtered"] }),
      (_, n) => n,
    ),
    true,
  );
  assert.deepEqual(h.render().data, { rows: ["filtered"] });
  h.unmount();
});

test("first read and retained-data refresh failures have load recovery, not empty or pagination", async () => {
  const h = await harness();
  h.render("owner", async () => { throw new Error("Offline"); });
  await tick();
  assert.equal(h.render().data, null);
  assert.equal(h.render().errorSource, "load");
  await h.render("owner", async () => ({ rows: ["saved"] })).reload(true);
  await h.render("owner", async () => { throw new Error("Offline"); }).reload(true);
  assert.deepEqual(h.render().data, { rows: ["saved"] });
  assert.equal(h.render().errorSource, "load");
  assert.equal(h.render().loadingMore, false);
  h.unmount();
});

test("failed pagination retains rows and its retry clears only the page failure", async () => {
  const h = await harness();
  h.render("owner", async () => ({ rows: ["one"], nextCursor: "next" }));
  await tick();
  const page = deferred();
  const request = h.render().append(() => page.promise, (a, b) => ({ rows: [...a.rows, ...b.rows] }));
  assert.equal(h.render().loadingMore, true);
  assert.deepEqual(h.render().data.rows, ["one"]);
  page.reject(new Error("Offline"));
  assert.equal(await request, false);
  assert.equal(h.render().errorSource, "more");
  assert.equal(h.render().loadingMore, false);
  assert.equal(h.render().data.nextCursor, "next");
  assert.equal(await h.render().append(async () => ({ rows: ["two"] }), (a, b) => ({ rows: [...a.rows, ...b.rows] })), true);
  assert.deepEqual(h.render().data.rows, ["one", "two"]);
  assert.equal(h.render().errorSource, null);
  h.unmount();
});

test("changing identity removes the previous request's recovery context", async () => {
  const h = await harness();
  h.render("owner:a", async () => { throw new Error("Offline"); });
  await tick();
  const next = deferred();
  const view = h.render("owner:b", () => next.promise);
  assert.equal(view.error, null);
  assert.equal(view.errorSource, null);
  assert.equal(view.data, null);
  next.resolve({ rows: [] });
  await tick();
  assert.equal(h.render().errorSource, null);
  h.unmount();
});
