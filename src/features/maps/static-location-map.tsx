import { Text } from "@/components/ui/text";
import {
  loadMapLibreModule,
  MAP_LOAD_TIMEOUT_MS,
  MAP_STYLE_URL,
  type MapLibreModule,
} from "@/features/maps/map-runtime";
import { useAppColors } from "@/hooks/use-app-colors";
import { MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

export type StaticLocationMapProps = {
  latitude: number;
  longitude: number;
  label: string;
  height?: number;
  zoom?: number;
};

export function StaticLocationMap({
  latitude,
  longitude,
  label,
  height = 176,
  zoom = 15,
}: StaticLocationMapProps) {
  const [mapModule, setMapModule] = useState<MapLibreModule | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [accentColor] = useAppColors(["accent"]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let active = true;
    void loadMapLibreModule()
      .then((module) => {
        if (active) setMapModule(module);
      })
      .catch(() => {
        if (active) setMapLoadError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapModule || mapReady || mapLoadError) return;

    const timeout = setTimeout(
      () => setMapLoadError(true),
      MAP_LOAD_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [mapLoadError, mapModule, mapReady]);

  const Map = mapModule?.Map;
  const Camera = mapModule?.Camera;
  const Marker = mapModule?.Marker;

  if (Platform.OS === "web" || !Map || !Camera || !Marker || mapLoadError) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Map showing ${label}`}
        pointerEvents="none"
        className="items-center justify-center rounded-lg bg-secondary px-6"
        style={{ height }}
      >
        <MapPin size={28} color={accentColor} />
        <Text className="mt-2 text-center text-sm font-semibold text-foreground">
          {label}
        </Text>
        <Text className="mt-1 text-center text-xs text-muted-foreground">
          {mapLoadError
            ? "Map preview is temporarily unavailable."
            : "Map preview is available on Android and iOS."}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Map showing ${label}`}
      pointerEvents="none"
      className="overflow-hidden rounded-lg border border-border"
      style={{ height }}
    >
      <Map
        style={{ flex: 1 }}
        mapStyle={MAP_STYLE_URL}
        androidView="texture"
        dragPan={false}
        touchZoom={false}
        touchRotate={false}
        touchPitch={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        compass={false}
        logo={false}
        attribution={false}
        onDidFinishLoadingMap={() => setMapReady(true)}
        onDidFailLoadingMap={() => setMapLoadError(true)}
      >
        <Camera center={[longitude, latitude]} zoom={zoom} />
        <Marker id="static-location" lngLat={[longitude, latitude]}>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
            <MapPin size={20} color="white" />
          </View>
        </Marker>
      </Map>
    </View>
  );
}
