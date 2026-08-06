import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetContent,
  BottomSheetPortal,
  type BottomSheetRef,
} from "@/components/ui/bottomsheet";
import {
  Button,
  ButtonIcon,
  ButtonSpinner,
  ButtonText,
} from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import {
  loadMapLibreModule,
  MAP_LOAD_TIMEOUT_MS,
  MAP_STYLE_URL,
  type MapLibreModule,
} from "@/features/maps/map-runtime";
import {
  canUseResolvedPin,
  formatResolvedAddress,
  resolvePsgcAddress,
  type ResolvedReportAddress,
} from "@/features/reports/address";
import { isWithinAlbay } from "@/features/reports/contract";
import type { ComplaintMeta } from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import * as Location from "expo-location";
import { LocateFixed, MapPin, Navigation, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AlbayCoordinates = { latitude: number; longitude: number };

export type AlbayLocationSelection = {
  coordinates: AlbayCoordinates;
  address: ResolvedReportAddress;
};

type Props = {
  open: boolean;
  initialCoordinates: AlbayCoordinates | null;
  meta: ComplaintMeta;
  onClose: () => void;
  onConfirm: (selection: AlbayLocationSelection) => void;
};

const albayCenter = { latitude: 13.1775, longitude: 123.528 };
const albayBounds = {
  minLatitude: 12.9,
  maxLatitude: 13.55,
  minLongitude: 123.25,
  maxLongitude: 124,
};

function clampToAlbay(coordinates: AlbayCoordinates) {
  return {
    latitude: Math.min(
      albayBounds.maxLatitude,
      Math.max(albayBounds.minLatitude, coordinates.latitude),
    ),
    longitude: Math.min(
      albayBounds.maxLongitude,
      Math.max(albayBounds.minLongitude, coordinates.longitude),
    ),
  };
}

function toLngLat(coordinates: AlbayCoordinates): [number, number] {
  return [coordinates.longitude, coordinates.latitude];
}

export function AlbayLocationPickerSheet({
  open,
  initialCoordinates,
  meta,
  onClose,
  onConfirm,
}: Props) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const reverseGeocodeRequestRef = useRef(0);
  const insets = useSafeAreaInsets();
  const [accentColor, mutedColor] = useAppColors([
    "accent",
    "muted-foreground",
  ]);
  const [mapModule, setMapModule] = useState<MapLibreModule | null>(null);
  const [coordinates, setCoordinates] = useState<AlbayCoordinates | null>(null);
  const [currentCoordinates, setCurrentCoordinates] =
    useState<AlbayCoordinates | null>(null);
  const [address, setAddress] = useState<ResolvedReportAddress | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void loadMapLibreModule()
      .then((module) => {
        if (active) setMapModule(module);
      })
      .catch(() => {
        if (active) setMapLoadError("Map is not available on this device.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      reverseGeocodeRequestRef.current += 1;
      sheetRef.current?.close();
      return;
    }

    setCoordinates(clampToAlbay(initialCoordinates ?? albayCenter));
    setAddress(null);
    setLocationError(null);
    setMapLoadError(null);
    setMapReady(false);
    requestAnimationFrame(() => sheetRef.current?.open());
  }, [initialCoordinates, open]);

  useEffect(() => {
    if (!open || !coordinates) return;

    const requestId = ++reverseGeocodeRequestRef.current;
    const timeout = setTimeout(() => {
      setIsResolvingAddress(true);
      void Location.reverseGeocodeAsync(coordinates)
        .then(([nextAddress]) => {
          if (requestId !== reverseGeocodeRequestRef.current || !nextAddress) return;
          setAddress(resolvePsgcAddress(nextAddress, meta));
        })
        .catch(() => {
          if (requestId === reverseGeocodeRequestRef.current) setAddress(null);
        })
        .finally(() => {
          if (requestId === reverseGeocodeRequestRef.current) {
            setIsResolvingAddress(false);
          }
        });
    }, 350);

    return () => {
      if (requestId === reverseGeocodeRequestRef.current) {
        reverseGeocodeRequestRef.current += 1;
      }
      clearTimeout(timeout);
    };
  }, [coordinates, meta, open]);

  useEffect(() => {
    if (!open || !coordinates || !mapModule || mapReady || mapLoadError) return;
    const timeout = setTimeout(
      () => setMapLoadError("Map is taking too long to load."),
      MAP_LOAD_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [coordinates, mapLoadError, mapModule, mapReady, open]);

  const locateCurrentPosition = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError("Location permission denied. Drag the pin manually.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (!current) {
        setLocationError("Current location is unavailable. Drag the pin manually.");
        return;
      }
      const next = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      if (!isWithinAlbay(next.latitude, next.longitude)) {
        setLocationError("Your current location is outside Albay.");
        return;
      }
      setCurrentCoordinates(next);
      setCoordinates(next);
    } finally {
      setIsLocating(false);
    }
  };

  const Map = mapModule?.Map;
  const Camera = mapModule?.Camera;
  const Marker = mapModule?.Marker;
  const ViewAnnotation = mapModule?.ViewAnnotation;
  const NativeUserLocation = mapModule?.NativeUserLocation;

  return (
    <BottomSheet ref={sheetRef} onClose={onClose}>
      <BottomSheetPortal
        snapPoints={["100%"]}
        enableDynamicSizing
        enableContentPanningGesture={false}
        enableHandlePanningGesture={false}
        enablePanDownToClose={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
      >
        <BottomSheetContent
          className="flex-1"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-start justify-between gap-3 pb-1">
            <View className="flex-1">
              <Heading size="lg">Choose location</Heading>
              <Text className="text-sm text-muted-foreground">
                Move the pin within Albay, then confirm the matched address.
              </Text>
            </View>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onPress={onClose}
              accessibilityLabel="Close map picker"
            >
              <ButtonIcon as={X} height={20} width={20} />
            </Button>
          </View>

          <View className="flex-1 overflow-hidden rounded-lg border border-border bg-secondary">
            {Platform.OS === "web" ||
            !Map ||
            !Camera ||
            !Marker ||
            !ViewAnnotation ||
            !coordinates ||
            mapLoadError ? (
              <View className="h-96 items-center justify-center px-6">
                <MapPin size={36} color={accentColor} />
                <Text className="mt-2 text-center text-sm text-muted-foreground">
                  {Platform.OS === "web"
                    ? "Native map picker is available on Android and iOS."
                    : (mapLoadError ?? "Loading map...")}
                </Text>
              </View>
            ) : (
              <Map
                style={{ flex: 1, minHeight: 420 }}
                mapStyle={MAP_STYLE_URL}
                androidView="texture"
                compass
                logo={false}
                attribution
                onDidFailLoadingMap={() =>
                  setMapLoadError("Map style failed to load. Check Aleconnect server.")
                }
                onDidFinishLoadingMap={() => setMapReady(true)}
                onPress={(event) => {
                  const [longitude, latitude] = event.nativeEvent.lngLat;
                  setCoordinates(clampToAlbay({ latitude, longitude }));
                }}
              >
                <Camera
                  center={toLngLat(coordinates)}
                  zoom={13}
                  maxBounds={[
                    albayBounds.minLongitude,
                    albayBounds.minLatitude,
                    albayBounds.maxLongitude,
                    albayBounds.maxLatitude,
                  ]}
                  duration={0}
                />
                {NativeUserLocation ? <NativeUserLocation /> : null}
                {currentCoordinates ? (
                  <Marker id="current-location" lngLat={toLngLat(currentCoordinates)}>
                    <View className="h-5 w-5 rounded-full border-2 border-white bg-blue-500" />
                  </Marker>
                ) : null}
                <ViewAnnotation
                  id="selected-location"
                  lngLat={toLngLat(coordinates)}
                  draggable
                  onDragEnd={(event) => {
                    const [longitude, latitude] = event.nativeEvent.lngLat;
                    setCoordinates(clampToAlbay({ latitude, longitude }));
                  }}
                >
                  <View className="items-center">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary shadow-lg">
                      <MapPin size={20} color="white" />
                    </View>
                    <View className="-mt-1 h-3 w-3 rotate-45 bg-primary" />
                  </View>
                </ViewAnnotation>
              </Map>
            )}
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-xs font-bold text-muted-foreground">
              Selected address
            </Text>
            <Text className="mt-1 text-sm font-bold leading-5 text-foreground">
              {isResolvingAddress
                ? "Finding this address..."
                : address
                  ? formatResolvedAddress(address)
                  : "Move the pin to identify an address."}
            </Text>
            {address && !address.municipalityCode ? (
              <Text className="mt-2 text-xs text-warning">
                Municipality could not be matched. Move the pin closer to the address.
              </Text>
            ) : address && !address.barangayPsgc ? (
              <Text className="mt-2 text-xs text-warning">
                Barangay could not be matched. Select it after using this pin.
              </Text>
            ) : null}
            {locationError ? (
              <Text className="mt-2 text-xs text-destructive">{locationError}</Text>
            ) : null}
          </View>

          <View className="flex-row gap-2">
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onPress={() => void locateCurrentPosition()}
              isDisabled={isLocating}
            >
              {isLocating ? (
                <ButtonSpinner size="small" color={mutedColor} />
              ) : (
                <ButtonIcon as={LocateFixed} height={18} width={18} />
              )}
              <ButtonText>{isLocating ? "Locating..." : "Use my location"}</ButtonText>
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onPress={() => {
                if (coordinates && address) onConfirm({ coordinates, address });
              }}
              isDisabled={!coordinates || isResolvingAddress || !canUseResolvedPin(address)}
            >
              <ButtonIcon as={Navigation} height={18} width={18} />
              <ButtonText>Use this pin</ButtonText>
            </Button>
          </View>
          <Text className="text-center text-xs text-muted-foreground">
            Location selection is limited to Albay.
          </Text>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
}
