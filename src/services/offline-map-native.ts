import NetInfo from "@react-native-community/netinfo";
import { Directory, File, Paths } from "expo-file-system";
import { requireOptionalNativeModule } from "expo-modules-core";
import { AppState, Platform } from "react-native";
import bundledStyle from "@/assets/maps/albay-bright.json";
import { createApiRequestId } from "./api";
import { createOfflineMaps, OFFLINE_MAP_STYLE_VERSION, type OfflineMapGuard } from "./offline-maps";
import { loadMapLibreModule } from "@/features/maps/map-runtime";

type NativeGuard = OfflineMapGuard & { capabilities(): Promise<{ version: number; platform: string }> };
const guard = Platform.OS === "web" ? null : requireOptionalNativeModule<NativeGuard>("ConsumerOfflineMaps");
let capability: Promise<boolean> | undefined;
export function offlineMapSupport() {
  capability ??= guard && (Platform.OS === "android" || Platform.OS === "ios")
    ? guard.capabilities().then((value) => value.version === 1 && value.platform === Platform.OS).catch(() => {
      capability = undefined;
      return false;
    })
    : Promise.resolve(false);
  return capability;
}

export async function nativeMapStyle() {
  if (Platform.OS === "web") throw Error("Offline maps require Android or iOS.");
  await offlineMapSupport();
  const directory = new Directory(Paths.document, "public-maps");
  directory.create({ idempotent: true, intermediates: true });
  const style = new File(directory, `${OFFLINE_MAP_STYLE_VERSION}.json`);
  // Keep the resolved source release unchanged for every resume and cold offline launch.
  if (!style.exists) style.write(JSON.stringify(bundledStyle));
  return style.uri;
}

const unavailable = async (): Promise<never> => { throw Error("Native map downloads are unavailable in this build."); };
const manager = createOfflineMaps({
  available: offlineMapSupport, style: nativeMapStyle,
  verifyStyle: async (uri) => {
    try {
      if (uri !== new File(new Directory(Paths.document, "public-maps"), `${OFFLINE_MAP_STYLE_VERSION}.json`).uri) return false;
      const file = new File(uri);
      if (!file.exists) return false;
      const style = JSON.parse(await file.text());
      const source = style.sources?.openmaptiles;
      return style.version === 8 && style.glyphs === bundledStyle.glyphs && style.sprite === bundledStyle.sprite &&
        source?.type === "vector" && source.maxzoom === 14 && !source.url && Array.isArray(source.tiles) && source.tiles.length > 0 &&
        source.tiles.every((tile: unknown) => typeof tile === "string" && tile.startsWith("https://tiles.openfreemap.org/planet/"));
    } catch { return false; }
  },
  freeBytes: () => Paths.availableDiskSpace,
  id: createApiRequestId,
  network: async () => { const state = await NetInfo.fetch(); return state.isConnected === false || state.isInternetReachable === false ? "none" : state.type; },
  guard: guard ?? { prepare: unavailable, stop: unavailable, finish: unavailable, status: unavailable },
  manager: {
    getPacks: async () => (await loadMapLibreModule()).OfflineManager.getPacks(),
    createPack: async (options, progress, error) => (await loadMapLibreModule()).OfflineManager.createPack(options, progress, error),
    addListener: async (id, progress, error) => (await loadMapLibreModule()).OfflineManager.addListener(id, progress, error),
  },
});
let watching = false;
export function offlineMaps() {
  if (!watching && Platform.OS !== "web") {
    watching = true;
    AppState.addEventListener("change", (state) => { if (state !== "active" && manager.snapshot().state === "downloading") void manager.pause().catch(() => undefined); });
    NetInfo.addEventListener((network) => {
      if (manager.snapshot().state !== "downloading") return;
      if (!network.isConnected || network.isInternetReachable === false || (network.type !== "wifi" && !mobileDataAllowed)) {
        mobileDataAllowed = false;
        void manager.pause().catch(() => undefined);
      }
    });
  }
  return manager;
}
let mobileDataAllowed = false;
export async function startOfflineMap(mobileData = false) {
  mobileDataAllowed = mobileData;
  return offlineMaps().start(mobileData);
}
