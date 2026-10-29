import { albayBounds } from "../features/reports/contract.ts";

export const ALBAY_MAP_BOUNDS: [number, number, number, number] = [
  albayBounds.minLongitude, albayBounds.minLatitude,
  albayBounds.maxLongitude, albayBounds.maxLatitude,
];
export const OFFLINE_MAP_STYLE_VERSION = "albay-bright-v1";
export const OFFLINE_MAP_POLICY = { minZoom: 9, maxZoom: 14, maxTiles: 3000, maxBytes: 50_000_000, reserveBytes: 100_000_000 } as const;
export type OfflineMapState = {
  state: "missing" | "downloading" | "paused" | "failed" | "ready";
  packId: string | null; percentage: number; bytes: number; error: string | null;
};
type NativeStatus = { state: string; percentage: number; completedResourceSize: number; completedTileCount: number; completedResourceCount: number; requiredResourceCount: number };
export type OfflineMapPack = { id: string; bounds: number[]; metadata: Record<string, unknown>; status(): Promise<NativeStatus>; pause(): Promise<void>; resume(): Promise<void> };
type Observer = (pack: OfflineMapPack, status: NativeStatus) => void | Promise<void>;
export type OfflineMapGuard = {
  prepare(value: { areaId: string; bounds: number[]; styleUrl: string; mobileData: boolean }): Promise<unknown>;
  stop(areaId?: string): Promise<unknown>; finish(areaId: string): Promise<unknown>;
  status(): Promise<{ blockedReason: string | null }>;
};
type Dependencies = {
  available(): Promise<boolean>; style(): Promise<string>; verifyStyle(uri: string): Promise<boolean>; freeBytes(): number;
  network(): Promise<string>; id(): string; guard: OfflineMapGuard;
  manager: {
    getPacks(): Promise<OfflineMapPack[]>;
    createPack(options: { mapStyle: string; bounds: [number, number, number, number]; minZoom: number; maxZoom: number; metadata: Record<string, unknown> }, progress: Observer, error: (pack: OfflineMapPack, error: { message: string }) => void): Promise<OfflineMapPack>;
    addListener(id: string, progress: Observer, error: (pack: OfflineMapPack, error: { message: string }) => void): Promise<unknown>;
  };
};

export function offlineTileCount(bounds: number[]) {
  let count = 0;
  for (let z = OFFLINE_MAP_POLICY.minZoom; z <= OFFLINE_MAP_POLICY.maxZoom; z++) {
    const n = 2 ** z;
    const x = (longitude: number) => Math.floor((longitude + 180) / 360 * n);
    const y = (latitude: number) => Math.floor((1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * n);
    count += (x(bounds[2]) - x(bounds[0]) + 1) * (y(bounds[1]) - y(bounds[3]) + 1);
  }
  return count;
}

export function createOfflineMaps(dependencies: Dependencies) {
  let value: OfflineMapState = { state: "missing", packId: null, percentage: 0, bytes: 0, error: null };
  let pack: OfflineMapPack | null = null;
  let starting: Promise<OfflineMapState> | null = null;
  let generation = 0;
  let activeArea: string | null = null;
  let observation = 0;
  const subscribers = new Set<(state: OfflineMapState) => void>();
  const publish = (next: Partial<OfflineMapState>) => {
    value = { ...value, ...next };
    subscribers.forEach((listener) => listener(value));
    return value;
  };
  const owned = (candidate: OfflineMapPack) => candidate.metadata.app === "aleconnect-mobile" && candidate.metadata.styleVersion === OFFLINE_MAP_STYLE_VERSION;
  const areaId = () => String(pack?.metadata.areaId ?? "");
  async function pauseNative() {
    const area = activeArea ?? (pack ? areaId() : null);
    if (!area) return;
    await dependencies.guard.stop(area);
    if (pack && (await pack.status()).state !== "complete") await pack.pause();
    await dependencies.guard.finish(area);
    activeArea = null;
  }
  async function fail(error: unknown) {
    await pauseNative().catch(() => undefined);
    return publish({ state: "failed", error: error instanceof Error ? error.message : "Map download failed. Retry when connected." });
  }
  async function observe(candidate: OfflineMapPack, status: NativeStatus, checkGuard = true) {
    if (pack && pack.id !== candidate.id) return value;
    pack = candidate;
    const observed = ++observation;
    const guardStatus = await dependencies.guard.status();
    if (observed !== observation) return value;
    if (checkGuard && guardStatus.blockedReason) return fail(Error(guardStatus.blockedReason));
    if (status.completedResourceSize > OFFLINE_MAP_POLICY.maxBytes || status.completedTileCount > OFFLINE_MAP_POLICY.maxTiles)
      return fail(Error("Map download limit reached. The original download is saved."));
    const complete = status.state === "complete" && status.requiredResourceCount > 0 &&
      status.completedResourceCount >= status.requiredResourceCount && status.completedTileCount > 0;
    if (complete && (candidate.bounds.length !== 4 || candidate.bounds.some((point, i) => point !== ALBAY_MAP_BOUNDS[i]) ||
      !await dependencies.verifyStyle(String(candidate.metadata.styleUrl))))
      return fail(Error("The saved Albay map or style is incomplete. Reconnect and retry setup."));
    if (observed !== observation) return value;
    if (complete) await pauseNative();
    return publish({ packId: candidate.id, state: complete ? "ready" : status.state === "active" ? "downloading" : "paused",
      percentage: complete ? 100 : Math.min(99, Math.max(0, status.percentage || 0)), bytes: status.completedResourceSize, error: null });
  }
  const onProgress: Observer = async (candidate, status) => { await observe(candidate, status).catch(fail); };
  const onError = (_candidate: OfflineMapPack, error: { message: string }) => { void fail(Error(error.message)); };
  async function restore() {
    try {
      if (!await dependencies.available()) throw Error("Native map downloads are unavailable in this build.");
      const packs = (await dependencies.manager.getPacks()).filter(owned);
      pack = packs[0] ?? null;
      if (!pack) return publish({ state: "missing", packId: null, percentage: 0, bytes: 0, error: null });
      // Old duplicate downloads remain preserved and paused; only one pack can transfer.
      await pauseNative();
      for (const candidate of packs) if ((await candidate.status()).state !== "complete") await candidate.pause();
      // Android attaches observers by activating the region. Restore only reads
      // paused state; attach after consent/storage checks and native preparation.
      return await observe(pack, await pack.status(), false);
    } catch (error) { return fail(error); }
  }
  async function start(mobileData = false) {
    if (starting) return starting;
    const operation = ++generation;
    starting = (async () => {
      try {
        const restored = await restore();
        if (restored.state === "ready") return restored;
        if (restored.state === "failed") throw Error(restored.error!);
        const network = await dependencies.network();
        if (network === "none" || network === "unknown") throw Error("Reconnect to download the Albay map.");
        if (network !== "wifi" && !mobileData) throw Error("Connect to Wi-Fi or allow mobile data to download the Albay map.");
        if (dependencies.freeBytes() < OFFLINE_MAP_POLICY.reserveBytes) throw Error("Free at least 100 MB of storage, then resume the Albay map.");
        const styleUrl = pack ? String(pack.metadata.styleUrl) : await dependencies.style();
        if (operation !== generation) throw Error("Map download paused.");
        const originalAreaId = pack ? areaId() : dependencies.id();
        if (pack && (pack.bounds.some((point, i) => point !== ALBAY_MAP_BOUNDS[i]) || !originalAreaId || !styleUrl.startsWith("file://")))
          throw Error("The original map download is incompatible. Keep it and update the app.");
        activeArea = originalAreaId;
        await dependencies.guard.prepare({ areaId: originalAreaId, bounds: ALBAY_MAP_BOUNDS, styleUrl, mobileData });
        if (operation !== generation) { await dependencies.guard.stop(originalAreaId); await dependencies.guard.finish(originalAreaId); throw Error("Map download paused."); }
        if (pack) {
          await dependencies.manager.addListener(pack.id, onProgress, onError);
          if ((await pack.status()).state !== "complete") await pack.resume();
        }
        else pack = await dependencies.manager.createPack({ mapStyle: styleUrl, bounds: ALBAY_MAP_BOUNDS, minZoom: OFFLINE_MAP_POLICY.minZoom, maxZoom: OFFLINE_MAP_POLICY.maxZoom,
          metadata: { app: "aleconnect-mobile", areaId: originalAreaId, styleVersion: OFFLINE_MAP_STYLE_VERSION, styleUrl } }, onProgress, onError);
        if (operation !== generation) { await pauseNative(); return publish({ state: "paused", packId: pack.id, error: null }); }
        if ((await pack.status()).state === "complete") return observe(pack, await pack.status());
        return publish({ state: "downloading", packId: pack.id, error: null });
      } catch (error) { await fail(error); throw error; }
      finally { starting = null; }
    })();
    return starting;
  }
  return {
    snapshot: () => value,
    subscribe(listener: (state: OfflineMapState) => void) { subscribers.add(listener); return () => { subscribers.delete(listener); }; },
    restore, start, resume: start,
    async pause() {
      generation++; observation++;
      if (starting && activeArea) await dependencies.guard.stop(activeArea);
      if (starting) await starting.catch(() => undefined);
      await pauseNative();
      return publish({ state: "paused", error: null });
    },
    async status() { return pack ? observe(pack, await pack.status()) : restore(); },
  };
}
