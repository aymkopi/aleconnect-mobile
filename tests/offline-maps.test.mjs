import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const maps = await import("../src/services/offline-maps.ts").catch(() => ({}));
const { albayBounds, isWithinAlbay } = await import("../src/features/reports/contract.ts");

function fixture(overrides = {}) {
  const packs = [], calls = [], listeners = new Map();
  let nativeStatus = { state: "inactive", percentage: 20, completedTileCount: 10, completedResourceSize: 100, completedResourceCount: 10, requiredResourceCount: 50 };
  const create = (options) => ({ id: "original-native-id", bounds: options.bounds, metadata: options.metadata,
    status: async () => nativeStatus, pause: async () => calls.push("pause"), resume: async () => calls.push("resume") });
  const dependencies = { available: async () => true, style: async () => "file:///documents/albay-bright-v1.json", verifyStyle: async () => true, freeBytes: () => 500_000_000,
    network: async () => "wifi", id: () => "original-download-id",
    guard: { prepare: async () => calls.push("prepare"), stop: async () => calls.push("stop"), finish: async () => calls.push("finish"), status: async () => ({ blockedReason: null }) },
    manager: { getPacks: async () => packs,
      createPack: async (options, progress) => { calls.push(options); const pack = create(options); packs.push(pack); listeners.set(pack.id, progress); return pack; },
      addListener: async (id, progress) => listeners.set(id, progress) }, ...overrides };
  return { calls, packs, dependencies, update(value) { nativeStatus = { ...nativeStatus, ...value }; }, async emit(value) { this.update(value); await listeners.get(packs[0].id)?.(packs[0], nativeStatus); } };
}

test("a restarted province download resumes its original pack without a second creation", async () => {
  assert.equal(typeof maps.createOfflineMaps, "function", "offline pack manager must exist");
  const f = fixture(), first = maps.createOfflineMaps(f.dependencies);
  await first.start();
  const restarted = maps.createOfflineMaps(f.dependencies);
  assert.equal((await restarted.restore()).state, "paused");
  await restarted.start();
  assert.equal(f.packs.length, 1);
  assert.equal(restarted.snapshot().packId, "original-native-id");
  assert.equal(f.packs[0].metadata.areaId, "original-download-id");
  assert.ok(f.calls.includes("resume"));
});

test("only native complete status with all resources makes a pack ready", async () => {
  const f = fixture(), manager = maps.createOfflineMaps(f.dependencies);
  await manager.start();
  await f.emit({ percentage: 100, state: "active" });
  assert.equal(manager.snapshot().state, "downloading");
  await f.emit({ state: "complete", completedResourceCount: 50 });
  assert.equal(manager.snapshot().state, "ready");
  f.update({ state: "inactive", percentage: 99 });
  assert.equal((await manager.status()).state, "paused", "a saved ready value is never authority");
});

test("Wi-Fi default refuses cellular without consent before style or pack transfer", async () => {
  const f = fixture({ network: async () => "cellular" }), manager = maps.createOfflineMaps(f.dependencies);
  await assert.rejects(manager.start(), /mobile data/i);
  assert.equal(f.packs.length, 0);
  assert.ok(!f.calls.includes("prepare"));
  await manager.start(true);
  assert.equal(f.packs.length, 1);
});

test("restoring a partial Android pack attaches its activating observer behind the native guard", async () => {
  const f = fixture();
  let suspended = false, unguarded = 0;
  f.dependencies.guard.stop = async () => { suspended = true; };
  f.dependencies.guard.finish = async () => { suspended = false; };
  await maps.createOfflineMaps(f.dependencies).start();
  f.dependencies.manager.addListener = async () => {
    // Installed Android MapLibre setPackObserver activates the region.
    if (!suspended) unguarded++;
    f.update({ state: "active" });
  };
  f.packs[0].pause = async () => { f.update({ state: "inactive" }); };
  const restored = await maps.createOfflineMaps(f.dependencies).restore();
  assert.equal(unguarded, 0, "native observation must not transfer before consent/budget checks");
  assert.equal(restored.state, "paused");
  assert.equal(suspended, false, "ordinary online maps can resume after the pack is paused");
});

test("missing native capability and insufficient storage retain a failed resumable setup", async () => {
  for (const overrides of [{ available: async () => false }, { freeBytes: () => 1 }]) {
    const f = fixture(overrides), manager = maps.createOfflineMaps(f.dependencies);
    await assert.rejects(manager.start(), /available|storage|space/i);
    assert.equal(manager.snapshot().state, "failed");
    assert.equal(f.packs.length, 0);
  }
});

test("request and storage limits pause original work and never declare a truncated pack ready", async () => {
  const f = fixture(), manager = maps.createOfflineMaps(f.dependencies);
  await manager.start();
  await f.emit({ completedResourceSize: 50_000_001, state: "active", completedResourceCount: 50 });
  assert.equal(manager.snapshot().state, "failed");
  assert.equal(manager.snapshot().packId, "original-native-id");
  assert.ok(f.calls.includes("stop"));
  assert.ok(f.calls.includes("pause"));
});

test("concurrent starts create one public pack and never include account or ticket metadata", async () => {
  const f = fixture(), manager = maps.createOfflineMaps(f.dependencies);
  await Promise.all([manager.start(), manager.start()]);
  assert.equal(f.packs.length, 1);
  const options = f.calls.find((value) => typeof value === "object");
  assert.deepEqual(options.bounds, [123.280548, 12.986185, 124.220096, 13.523255]);
  assert.equal(options.minZoom, 9);
  assert.equal(options.maxZoom, 14);
  assert.deepEqual(Object.keys(options.metadata).sort(), ["app", "areaId", "styleUrl", "styleVersion"]);
});

test("the full 720-feature Albay boundary, including eastern islands, fits report and pack extents", async () => {
  const geo = JSON.parse(await readFile(new URL("../assets/geo/albay_barangays.json", import.meta.url), "utf8"));
  assert.equal(geo.features.length, 720);
  const vertices = [];
  function visit(value) { if (typeof value[0] === "number") vertices.push(value); else value.forEach(visit); }
  geo.features.forEach((feature) => visit(feature.geometry.coordinates));
  for (const [longitude, latitude] of vertices) assert.ok(isWithinAlbay(latitude, longitude), `boundary vertex ${longitude},${latitude}`);
  assert.equal(albayBounds.maxLongitude, 124.220096);
  assert.equal(maps.offlineTileCount([albayBounds.minLongitude, albayBounds.minLatitude, albayBounds.maxLongitude, albayBounds.maxLatitude]), 1550);
  assert.equal(isWithinAlbay(Number.NaN, 123.7), false);
});

test("a completed native pack with a missing style or incomplete province scope cannot finish setup", async () => {
  for (const damagedStyle of [false, true]) {
    const f = fixture({ verifyStyle: async () => !damagedStyle });
    const manager = maps.createOfflineMaps(f.dependencies);
    await manager.start();
    f.update({ state: "complete", percentage: 100, completedResourceCount: 50 });
    if (!damagedStyle) f.packs[0].bounds = [123.5, 13, 124, 13.5];
    const restored = await maps.createOfflineMaps(f.dependencies).restore();
    assert.equal(restored.state, "failed");
    assert.equal(f.packs.length, 1);
  }
});

test("pausing while native pack creation is pending retains and pauses that original pack", async () => {
  const f = fixture();
  const originalCreate = f.dependencies.manager.createPack;
  let release, created;
  const waiting = new Promise((resolve) => { created = resolve; });
  f.dependencies.manager.createPack = async (...args) => { created(); await new Promise((resolve) => { release = resolve; }); return originalCreate(...args); };
  const manager = maps.createOfflineMaps(f.dependencies);
  const starting = manager.start();
  await waiting;
  const pausing = manager.pause();
  release();
  await Promise.all([starting, pausing]);
  assert.equal(manager.snapshot().state, "paused");
  assert.equal(f.packs.length, 1);
  assert.ok(f.calls.includes("pause"));
});

test("a previous native transport failure does not permanently prevent resuming the original pack", async () => {
  const f = fixture(), manager = maps.createOfflineMaps(f.dependencies);
  await manager.start();
  let blocked = "Map transfer was interrupted.";
  f.dependencies.guard.status = async () => ({ blockedReason: blocked });
  f.dependencies.guard.prepare = async () => { blocked = null; };
  f.update({ state: "inactive" });
  await manager.start();
  assert.equal(manager.snapshot().state, "downloading");
  assert.equal(f.packs.length, 1);
});
