import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { Text } from "@/components/panelui/text";
import { Skeleton } from "@/components/panelui/skeleton";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  loadMapLibreModule,
  MAP_LOAD_TIMEOUT_MS,
  MAP_STYLE_URL,
  type MapLibreModule,
} from "./map-runtime";
import { WebLocationMap } from "./web-location-map";
export type StaticLocationMapProps = {
  latitude: number;
  longitude: number;
  label: string;
  height?: number;
  zoom?: number;
  fixture?: boolean;
};
export function StaticLocationMap({
  latitude,
  longitude,
  label,
  height = 176,
  zoom = 15,
  fixture = false,
}: StaticLocationMapProps) {
  const focused = useIsFocused();
  const [module, setModule] = useState<MapLibreModule | null>(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [primary, primaryForeground] = useAppColors(["primary", "primary-foreground"]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    loadMapLibreModule()
      .then((next) => {
        if (active) setModule(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web" || ready || failed) return;
    const timeout = setTimeout(() => setFailed(true), MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [ready, failed]);
  const Map = module?.Map,
    Camera = module?.Camera,
    Marker = module?.Marker;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Map showing ${label}${fixture ? ", visual fixture" : ""}`}
      pointerEvents="none"
      className="rounded-xl overflow-hidden bg-muted"
      style={{ height }}
    >
      {Platform.OS === "web" && !failed ? (
        <>
          <WebLocationMap
            key={`${latitude}:${longitude}:${zoom}`}
            latitude={latitude}
            longitude={longitude}
            zoom={zoom}
            interactive={false}
            label={label}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
          >
            <MapPin size={28} color={primary} />
          </View>
        </>
      ) : Map && Camera && Marker && !failed ? (
        <Map
          style={{ flex: 1 }}
          mapStyle={MAP_STYLE_URL}
          androidView="texture"
          dragPan={false}
          touchZoom={false}
          touchRotate={false}
          touchPitch={false}
          doubleTapZoom={false}
          compass={false}
          logo={false}
          attribution={false}
          onDidFinishLoadingMap={() => setReady(true)}
          onDidFinishLoadingStyle={() => setReady(true)}
          onDidFailLoadingMap={() => setFailed(true)}
        >
          <Camera center={[longitude, latitude]} zoom={zoom} />
          <Marker id="report-location" lngLat={[longitude, latitude]}>
            <View className="h-9 w-9 rounded-full bg-primary items-center justify-center">
              <MapPin size={20} color={primaryForeground} />
            </View>
          </Marker>
        </Map>
      ) : (
        <View className="flex-1 items-center justify-center px-4 gap-2">
          <MapPin size={28} color={primary} />
          <Text size="sm" weight="semibold" className="text-center">
            {label}
          </Text>
          <Text size="xs" muted className="text-center">
            {failed
              ? "Map preview is temporarily unavailable."
              : "Map preview is available on Android and iOS."}
          </Text>
        </View>
      )}
      {!ready && !failed ? (
        <Skeleton animated={focused} label="Loading map preview" className="absolute inset-0" />
      ) : null}
    </View>
  );
}
