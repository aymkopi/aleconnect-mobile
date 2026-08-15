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
  formatResolvedAddress,
  resolvePsgcAddress,
  type ResolvedReportAddress,
} from "@/features/reports/address";
import {
  findAlbayBarangay,
  type DetectedBarangay,
} from "@/features/reports/albay-barangays";
import { isWithinAlbay } from "@/features/reports/contract";
import type { ComplaintMeta } from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { LocateFixed, MapPin, Navigation, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AlbayCoordinates = {
  latitude: number;
  longitude: number;
};

export type AlbayLocationSelection = {
  coordinates: AlbayCoordinates;
  address: ResolvedReportAddress;

  psgc: {
    municipality: string;
    barangay: string;
  };
};

type Props = {
  open: boolean;
  initialCoordinates: AlbayCoordinates | null;
  meta: ComplaintMeta;
  onClose: () => void;
  onConfirm: (selection: AlbayLocationSelection) => void;
};

const albayCenter: AlbayCoordinates = {
  latitude: 13.1775,
  longitude: 123.528,
};

const albayBounds = {
  minLatitude: 12.9,
  maxLatitude: 13.55,
  minLongitude: 123.25,
  maxLongitude: 124,
};

const PLUS_CODE_PREFIX =
  /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,}\s*,?\s*/i;

type GeocodedAddressWithFormatted = Location.LocationGeocodedAddress & {
  formattedAddress?: string | null;
};

function clampToAlbay(coordinates: AlbayCoordinates): AlbayCoordinates {
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

function coordinatesAreEqual(
  left: AlbayCoordinates | null,
  right: AlbayCoordinates,
) {
  if (!left) return false;

  return (
    Math.abs(left.latitude - right.latitude) < 0.0000001 &&
    Math.abs(left.longitude - right.longitude) < 0.0000001
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function stripLeadingPlusCode(value: string | null | undefined) {
  if (!value) return null;

  const cleaned = value.trim().replace(PLUS_CODE_PREFIX, "").trim();
  return cleaned || null;
}

function createFallbackGeocodedAddress(
  barangay: DetectedBarangay,
): GeocodedAddressWithFormatted {
  return {
    city: null,
    country: "Philippines",
    district: barangay.barangayName,
    formattedAddress: `${barangay.barangayName}, Albay`,
    isoCountryCode: "PH",
    name: null,
    postalCode: null,
    region: "Albay",
    street: null,
    streetNumber: null,
    subregion: barangay.barangayName,
    timezone: null,
  } as GeocodedAddressWithFormatted;
}

function sanitizeGeocodedAddress(
  address: GeocodedAddressWithFormatted,
  barangay: DetectedBarangay,
): GeocodedAddressWithFormatted {
  return {
    ...address,

    // Do not let a Plus Code become the visible street/purok value.
    name: stripLeadingPlusCode(address.name),
    street: stripLeadingPlusCode(address.street),
    formattedAddress: stripLeadingPlusCode(address.formattedAddress),

    // The polygon boundary is authoritative for the barangay.
    district: barangay.barangayName,
    subregion: barangay.barangayName,
  };
}

function resolveAddressWithBarangay(
  nativeAddress: GeocodedAddressWithFormatted | null,
  barangay: DetectedBarangay,
  meta: ComplaintMeta,
): ResolvedReportAddress {
  const sourceAddress = sanitizeGeocodedAddress(
    nativeAddress ?? createFallbackGeocodedAddress(barangay),
    barangay,
  );

  const resolved = resolvePsgcAddress(sourceAddress, meta);

  return {
    ...resolved,
    purok: stripLeadingPlusCode(resolved.purok) ?? "",
  };
}

export function AlbayLocationPickerSheet({
  open,
  initialCoordinates,
  meta,
  onClose,
  onConfirm,
}: Props) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  const locatingRef = useRef(false);
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
  const [detectedBarangay, setDetectedBarangay] =
    useState<DetectedBarangay | null>(null);

  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

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
        if (active) {
          setMapLoadError("Map is not available on this device.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Important: this effect depends only on `open`.
  // It no longer closes the sheet again when unrelated form values change.
  useEffect(() => {
    if (!open) {
      reverseGeocodeRequestRef.current += 1;

      setIsResolvingAddress(false);

      sheetRef.current?.close();
      return;
    }

    const frame = requestAnimationFrame(() => {
      sheetRef.current?.open();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Only initialize the map position if the picker
    // does not already have a location.
    setCoordinates((current) => {
      if (current) {
        return current;
      }

      return clampToAlbay(initialCoordinates ?? albayCenter);
    });

    setLocationError(null);
    setAddressError(null);
  }, [open, initialCoordinates?.latitude, initialCoordinates?.longitude]);

  useEffect(() => {
    if (!open || !coordinates) return;

    const barangay = findAlbayBarangay(
      coordinates.latitude,
      coordinates.longitude,
    );

    setDetectedBarangay(barangay);

    if (!barangay) {
      reverseGeocodeRequestRef.current += 1;
      setAddress(null);
      setIsResolvingAddress(false);
      setAddressError(
        "No Albay barangay boundary matched this point. Move the map slightly and try again.",
      );
      return;
    }

    setAddressError(null);

    const requestId = ++reverseGeocodeRequestRef.current;

    // Mark as updating immediately so the old address
    // cannot accidentally be confirmed for new coordinates.
    setIsResolvingAddress(true);

    const timeout = setTimeout(() => {
      void Location.reverseGeocodeAsync(coordinates)
        .then(([nativeAddress]) => {
          if (requestId !== reverseGeocodeRequestRef.current) return;

          setAddress(
            resolveAddressWithBarangay(nativeAddress ?? null, barangay, meta),
          );
        })
        .catch(() => {
          if (requestId !== reverseGeocodeRequestRef.current) return;

          // Reverse geocoding is only supplementary now.
          // The GeoJSON barangay boundary is enough to preserve the
          // authoritative municipality/barangay identifiers.
          setAddress(resolveAddressWithBarangay(null, barangay, meta));
        })
        .finally(() => {
          if (requestId === reverseGeocodeRequestRef.current) {
            setIsResolvingAddress(false);
          }
        });
    }, 600); // Debounce to avoid excessive reverse geocoding requests.

    return () => {
      clearTimeout(timeout);

      if (requestId === reverseGeocodeRequestRef.current) {
        reverseGeocodeRequestRef.current += 1;
      }
    };
  }, [coordinates, meta, open]);

  const canLoadMap = open && coordinates != null && mapModule != null;

  useEffect(() => {
    if (!canLoadMap || mapReady || mapLoadError) return;

    const timeout = setTimeout(() => {
      setMapLoadError("Map is taking too long to load.");
    }, MAP_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [canLoadMap, mapLoadError, mapReady]);
  const animateCameraToLocation = useCallback(
    async (next: AlbayCoordinates) => {
      const camera = cameraRef.current;

      // Keep the device marker available while moving.
      setCurrentCoordinates(next);

      // Fallback if the map/camera is not ready yet.
      if (!camera || !mapReady) {
        setCoordinates(next);
        return;
      }

      try {
        // 1. Zoom away from the currently selected location.
        await camera.zoomTo(10.5, {
          duration: 250,
          easing: "ease",
        });

        // 2. Travel across the map while zoomed out.
        await camera.flyTo({
          center: toLngLat(next),
          zoom: 10.5,
          duration: 600,
          easing: "fly",
        });

        // 3. Zoom into the detected device location.
        await camera.zoomTo(16, {
          duration: 350,
          easing: "ease",
        });
      } finally {
        // Synchronize React state with the final camera position.
        setCoordinates(next);
      }
    },
    [mapReady],
  );
  const locateCurrentPosition = useCallback(async () => {
    if (locatingRef.current) return;

    locatingRef.current = true;
    setIsLocating(true);
    setLocationError(null);

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (!permission.granted) {
        setLocationError(
          "Location permission is required. You can still move the map manually.",
        );
        return;
      }

      let servicesEnabled = await Location.hasServicesEnabledAsync();

      if (Platform.OS === "android") {
        try {
          const provider = await Location.getProviderStatusAsync();

          if (
            !provider.locationServicesEnabled ||
            provider.gpsAvailable === false
          ) {
            await Location.enableNetworkProviderAsync();
          }
        } catch {
          // The user may decline Android's improved-accuracy dialog.
          // Continue and try the providers that are still available.
        }

        servicesEnabled = await Location.hasServicesEnabledAsync();
      }

      if (!servicesEnabled) {
        setLocationError(
          "Device Location Services are turned off. Turn them on and try again.",
        );
        return;
      }

      // Fast fallback while the device is obtaining a fresh GPS fix.
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 30_000,
        requiredAccuracy: 100,
      }).catch(() => null);

      let usableLastKnown: AlbayCoordinates | null = null;

      if (lastKnown) {
        const cachedCoordinates: AlbayCoordinates = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };

        if (
          isWithinAlbay(cachedCoordinates.latitude, cachedCoordinates.longitude)
        ) {
          usableLastKnown = cachedCoordinates;
        }
      }

      const current = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
        8_000,
      );

      if (!current) {
        if (usableLastKnown) {
          await animateCameraToLocation(usableLastKnown);

          setLocationError(null);

          return;
        }

        setLocationError(
          "Unable to determine your current location. Make sure GPS is enabled and try again.",
        );
        return;
      }

      const next: AlbayCoordinates = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      if (!isWithinAlbay(next.latitude, next.longitude)) {
        setLocationError("Your current device location is outside Albay.");
        return;
      }

      await animateCameraToLocation(next);

      setLocationError(null);
    } catch (error) {
      console.warn("Failed to determine current location:", error);

      setLocationError(
        "Unable to determine your current location. Check your device location settings and try again.",
      );
    } finally {
      locatingRef.current = false;
      setIsLocating(false);
    }
  }, [animateCameraToLocation]);

  const Map = mapModule?.Map;
  const Camera = mapModule?.Camera;
  const Marker = mapModule?.Marker;
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
          style={{
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View className="flex-row items-start justify-between gap-3 pb-1">
            <View className="flex-1">
              <Heading size="lg">Choose location</Heading>

              <Text className="text-sm text-muted-foreground">
                Move the map under the fixed pin, then confirm the location.
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

          <View className="relative flex-1 overflow-hidden rounded-lg border border-border bg-secondary">
            {Platform.OS === "web" ||
            !Map ||
            !Camera ||
            !Marker ||
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
              <>
                <Map
                  style={{
                    flex: 1,
                    minHeight: 420,
                  }}
                  mapStyle={MAP_STYLE_URL}
                  androidView="texture"
                  dragPan={!isLocating}
                  touchZoom={!isLocating}
                  doubleTapZoom={!isLocating}
                  touchRotate={false}
                  touchPitch={false}
                  compass={false}
                  logo={false}
                  attribution
                  onWillStartLoadingMap={() => {
                    setMapReady(false);
                    setMapLoadError(null);
                  }}
                  onDidFinishLoadingStyle={() => {
                    setMapReady(true);
                    setMapLoadError(null);
                  }}
                  onDidFinishLoadingMap={() => {
                    setMapReady(true);
                    setMapLoadError(null);
                  }}
                  onDidFinishRenderingMapFully={() => {
                    setMapReady(true);
                    setMapLoadError(null);
                  }}
                  onDidFailLoadingMap={() => {
                    setMapReady(false);
                    setMapLoadError(
                      "Map style failed to load. Check Aleconnect server.",
                    );
                  }}
                  onRegionDidChange={(event) => {
                    const [longitude, latitude] = event.nativeEvent.center;

                    const next = clampToAlbay({
                      latitude,
                      longitude,
                    });

                    setCoordinates((current) =>
                      coordinatesAreEqual(current, next) ? current : next,
                    );
                  }}
                >
                  <Camera
                    ref={cameraRef}
                    center={toLngLat(coordinates)}
                    bearing={0}
                    pitch={0}
                    initialViewState={{
                      center: toLngLat(coordinates),
                      zoom: 16,
                      bearing: 0,
                      pitch: 0,
                    }}
                    maxBounds={[
                      albayBounds.minLongitude,
                      albayBounds.minLatitude,
                      albayBounds.maxLongitude,
                      albayBounds.maxLatitude,
                    ]}
                    duration={0}
                  />

                  {NativeUserLocation ? (
                    <NativeUserLocation />
                  ) : currentCoordinates ? (
                    <Marker
                      id="current-location"
                      lngLat={toLngLat(currentCoordinates)}
                    >
                      <View className="h-5 w-5 rounded-full border-2 border-white bg-blue-500" />
                    </Marker>
                  ) : null}
                </Map>

                {/* The pin is visual only. All gestures go to the map below it. */}
                <View
                  pointerEvents="none"
                  className="absolute inset-0 items-center justify-center"
                >
                  <View
                    className="items-center"
                    style={{
                      transform: [{ translateY: -22 }],
                    }}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary shadow-lg">
                      <MapPin size={20} color="white" />
                    </View>

                    <View className="-mt-1 h-3 w-3 rotate-45 bg-primary" />
                  </View>
                </View>
              </>
            )}
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-xs font-bold text-muted-foreground">
              Selected address
            </Text>

            <Text className="mt-1 text-sm font-bold leading-5 text-foreground">
              {address
                ? formatResolvedAddress(address)
                : isResolvingAddress
                  ? "Finding this address..."
                  : "Move the map to identify an address."}
            </Text>

            {address && isResolvingAddress ? (
              <Text className="mt-1 text-xs text-muted-foreground">
                Updating address...
              </Text>
            ) : null}

            {!isResolvingAddress && addressError ? (
              <Text className="mt-2 text-xs text-warning">{addressError}</Text>
            ) : !isResolvingAddress && address && !address.municipalityCode ? (
              <Text className="mt-2 text-xs text-warning">
                Municipality could not be matched. Move the map slightly.
              </Text>
            ) : !isResolvingAddress && address && !address.barangayPsgc ? (
              <Text className="mt-2 text-xs text-warning">
                Barangay could not be matched. Move the map slightly.
              </Text>
            ) : null}

            {locationError ? (
              <Text className="mt-2 text-xs text-destructive">
                {locationError}
              </Text>
            ) : null}
          </View>

          <View className="flex-row gap-2">
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onPress={() => {
                void locateCurrentPosition();
              }}
              isDisabled={isLocating}
            >
              {isLocating ? (
                <ButtonSpinner size="small" color={mutedColor} />
              ) : (
                <ButtonIcon as={LocateFixed} height={18} width={18} />
              )}

              <ButtonText>
                {isLocating ? "Finding location..." : "Recenter on me"}
              </ButtonText>
            </Button>

            <Button
              size="lg"
              className="flex-1"
              onPress={() => {
                if (coordinates && address && detectedBarangay) {
                  onConfirm({
                    coordinates,
                    address,

                    psgc: {
                      municipality: detectedBarangay.municipalityPsgc,
                      barangay: detectedBarangay.barangayPsgc,
                    },
                  });
                }
              }}
              isDisabled={
                !coordinates ||
                !detectedBarangay ||
                !address ||
                isResolvingAddress
              }
            >
              <ButtonIcon as={Navigation} height={18} width={18} />

              <ButtonText>Use this location</ButtonText>
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
