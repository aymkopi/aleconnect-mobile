import { aleconnectAssetBaseUrl } from "@/constants/api";

export type MapLibreModule = typeof import("@maplibre/maplibre-react-native");

export const MAP_STYLE_URL = `${aleconnectAssetBaseUrl}/styles/map-bright.json?v=2`;
export const MAP_LOAD_TIMEOUT_MS = 12_000;

let mapModulePromise: Promise<MapLibreModule> | undefined;

export function loadMapLibreModule() {
  mapModulePromise ??= import("@maplibre/maplibre-react-native");
  return mapModulePromise;
}
