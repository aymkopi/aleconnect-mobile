import { useIsFocused } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, View } from "react-native";
import * as Location from "expo-location";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { LocateFixed, MapPin, Minus, Plus, Search } from "lucide-react-native";
import { ReportPage } from "@/features/reports/components/report-page";
import { Button } from "@/components/panelui/button";
import { Field } from "@/components/panelui/field";
import { Input } from "@/components/panelui/input";
import { Select } from "@/components/panelui/select";
import { Skeleton } from "@/components/panelui/skeleton";
import { Spinner } from "@/components/panelui/spinner";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import { isWithinAlbay } from "@/features/reports/contract";
import { findAlbayBarangay } from "@/features/reports/albay-barangays";
import { creationFixtureLocation } from "@/features/reports/creation-fixtures";
import type { ComplaintMeta } from "@/features/reports/data";
import type { HomeReportLocation } from "@/features/reports/address";
import { initialReportCoordinates, REPORT_MAP_BOUNDS, REPORT_MAP_MIN_ZOOM, REPORT_MAP_MAX_ZOOM, resolveReportPin } from "./report-location-state";
import {
  loadMapLibreModule,
  MAP_LOAD_TIMEOUT_MS,
  MAP_STYLE_URL,
  type MapLibreModule,
} from "./map-runtime";
import { WebLocationMap, type WebMapHandle } from "./web-location-map";
type Coordinates = { latitude: number; longitude: number };
async function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
type ReportLocationPickerProps = {
  open: boolean;
  initialCoordinates: Coordinates | null;
  meta: ComplaintMeta;
  onClose: () => void;
  onConfirm: (location: HomeReportLocation) => void;
  locateOnOpen?: boolean;
  fixture?: boolean;
};
export function ReportLocationPicker(props: ReportLocationPickerProps) {
  return props.open ? (
    <ActiveReportLocationPicker key={String(props.fixture)} {...props} />
  ) : null;
}
function ActiveReportLocationPicker({
  open,
  initialCoordinates,
  meta,
  onClose,
  onConfirm,
  locateOnOpen = false,
  fixture = false,
}: ReportLocationPickerProps) {
  const focused = useIsFocused();
  const [module, setModule] = useState<MapLibreModule | null>(null),
    [coordinates, setCoordinates] = useState(
      initialReportCoordinates(initialCoordinates ?? (fixture ? creationFixtureLocation : null)),
    ),
    [streetAddress, setStreetAddress] = useState<
      (Coordinates & { street: string }) | null
    >(null);
  const [ready, setReady] = useState(false),
    [mapError, setMapError] = useState<string | null>(null),
    [locationError, setError] = useState<string | null>(null),
    [resolvingPoint, setResolvingPoint] = useState<Coordinates | null>(null),
    [locating, setLocating] = useState(false),
    [searching, setSearching] = useState(false),
    [searchView, setSearchView] = useState(false),
    [retry, setRetry] = useState(0);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [initialCamera, setInitialCamera] = useState(() => ({ center: [coordinates.longitude, coordinates.latitude] as [number, number], zoom: 16 }));
  const [query, setQuery] = useState(""),
    [municipality, setMunicipality] = useState(""),
    [barangay, setBarangay] = useState(""),
    [manualLatitude, setManualLatitude] = useState(""),
    [manualLongitude, setManualLongitude] = useState("");
  const webCamera = useRef<WebMapHandle>(null);
  const camera = useRef<CameraRef>(null),
    zoom = useRef(16),
    generation = useRef(0),
    busy = useRef(false),
    openRef = useRef(open);
  const [primary, foreground] = useAppColors(["primary", "foreground"]);
  useEffect(
    () => () => {
      openRef.current = false;
      generation.current += 1;
    },
    [],
  );
  const pin = useMemo(() => {
    if (!isWithinAlbay(coordinates.latitude, coordinates.longitude))
      return null;
    const detected = findAlbayBarangay(
      coordinates.latitude,
      coordinates.longitude,
    );
    if (fixture) return detected ? { ...creationFixtureLocation, ...coordinates } : null;
    return resolveReportPin(coordinates, detected?.barangayPsgc ?? null, meta);
  }, [coordinates, fixture, meta]);
  const resolved = pin
    ? {
        ...pin,
        purok:
          streetAddress?.latitude === coordinates.latitude &&
          streetAddress.longitude === coordinates.longitude
            ? streetAddress.street
            : pin.purok,
      }
    : null;
  const pinError = !isWithinAlbay(coordinates.latitude, coordinates.longitude)
    ? "This point is outside Albay. Choose a location within Albay."
    : !pin
      ? "Choose a point on land within Albay. Water and locations outside its boundaries cannot be selected."
      : null;
  const error = locationError ?? pinError;
  const resolving = Boolean(pin && resolvingPoint?.latitude === coordinates.latitude && resolvingPoint?.longitude === coordinates.longitude);
  useEffect(() => {
    if (fixture) return;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    void Location.getForegroundPermissionsAsync().then(async permission => {
      if (!active || !permission.granted) return;
      setLocationAllowed(true);
      if (Platform.OS === "web") {
        const next = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 10 }, position => {
          if (active) setUserLocation(position.coords);
        });
        if (active) subscription = next;
        else next.remove();
      }
    }).catch(() => {});
    return () => { active = false; subscription?.remove(); };
  }, [fixture, locationAllowed]);
  useEffect(() => {
    if (!open || Platform.OS === "web") return;
    let active = true;
    loadMapLibreModule()
      .then((next) => {
        if (active) setModule(next);
      })
      .catch(() => {
        if (active)
          setMapError(
            "The map is unavailable. Search an address or enter coordinates to confirm its Albay location.",
          );
      });
    return () => {
      active = false;
    };
  }, [open, retry]);
  useEffect(() => {
    if (!open || ready || mapError) return;
    const timeout = setTimeout(
      () =>
        setMapError(
          "The map could not load. Search an address or enter coordinates, then retry the map.",
        ),
      MAP_LOAD_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [open, ready, mapError, retry]);
  useEffect(() => {
    if (!open || !pin || fixture) return;
    const request = ++generation.current;
    const timer = setTimeout(() => {
      setResolvingPoint(coordinates);
      void withTimeout(Location.reverseGeocodeAsync(coordinates), 6_000)
        .then((results) => {
          if (!openRef.current || request !== generation.current) return;
          setStreetAddress({
            ...coordinates,
            street: results?.[0]?.street ?? "",
          });
        })
        .catch(() => {
          if (openRef.current && request === generation.current)
            setStreetAddress({ ...coordinates, street: "" });
        })
        .finally(() => {
          if (openRef.current && request === generation.current)
            setResolvingPoint(null);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      if (generation.current === request) generation.current += 1;
    };
  }, [open, coordinates, pin, fixture]);
  const moveTo = useCallback((next: Coordinates) => {
    setCoordinates(next);
    setError(null);
    if (Platform.OS !== "web" && !camera.current)
      setInitialCamera({ center: [next.longitude, next.latitude], zoom: zoom.current });
    (Platform.OS === "web" ? webCamera.current : camera.current)?.flyTo({
      center: [next.longitude, next.latitude],
      zoom: zoom.current,
      duration: 500,
    });
  }, []);
  const locate = useCallback(async () => {
    if (busy.current) return;
    if (fixture) {
      moveTo(creationFixtureLocation);
      return;
    }
    busy.current = true;
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Location access was denied. Move the map manually or search an address.",
        );
        return;
      }
      if (openRef.current) setLocationAllowed(true);
      if (!(await Location.hasServicesEnabledAsync())) {
        setError(
          "Location Services are off. Enable them, move the map manually, or search an address.",
        );
        return;
      }
      const current = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
        8_000,
      );
      const position =
        current ??
        (await Location.getLastKnownPositionAsync({
          maxAge: 30_000,
          requiredAccuracy: 100,
        }));
      if (!openRef.current) return;
      if (!position) {
        setError(
          "Your location could not be found. Retry, move the map manually, or search an address.",
        );
        return;
      }
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(next);
      if (!isWithinAlbay(next.latitude, next.longitude)) {
        setError(
          "Your current location is outside Albay. Move the map manually or search within Albay.",
        );
        return;
      }
      moveTo(next);
    } catch {
      if (openRef.current)
        setError(
          "Your location could not be found. Move the map manually or search an address.",
        );
    } finally {
      busy.current = false;
      if (openRef.current) setLocating(false);
    }
  }, [fixture, moveTo]);
  useEffect(() => {
    if (!open || !locateOnOpen) return;
    const frame = requestAnimationFrame(() => void locate());
    return () => cancelAnimationFrame(frame);
  }, [open, locateOnOpen, locate]);
  const search = async () => {
    if (searching) return;
    if (fixture) {
      moveTo(creationFixtureLocation);
      setSearchView(false);
      setError(null);
      return;
    }
    const place =
      query.trim() ||
      [
        meta.barangays.find((item) => item.code === barangay)?.name,
        meta.municipalities.find((item) => item.code === municipality)?.name,
      ]
        .filter(Boolean)
        .join(", ");
    if (!place) {
      setError("Enter an address or choose a municipality and barangay.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      if (Platform.OS === "android") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!openRef.current) return;
        if (!permission.granted) {
          setError(
            "Location access was denied. Move the map manually or enter coordinates instead.",
          );
          return;
        }
        setLocationAllowed(true);
      }
      const results = await withTimeout(
        Location.geocodeAsync(`${place}, Albay, Philippines`),
        8_000,
      );
      if (!openRef.current) return;
      const found = results?.find(
        (item) =>
          isWithinAlbay(item.latitude, item.longitude) &&
          findAlbayBarangay(item.latitude, item.longitude),
      );
      if (!found) {
        setError(
          "No matching address in Albay was found. Try a barangay name or move the pin manually.",
        );
        return;
      }
      moveTo({ latitude: found.latitude, longitude: found.longitude });
      setSearchView(false);
    } catch {
      if (openRef.current)
        setError(
          "Address search is unavailable. Move the map manually or enter coordinates.",
        );
    } finally {
      if (openRef.current) setSearching(false);
    }
  };
  const manualPin = () => {
    const next = {
      latitude: Number(manualLatitude),
      longitude: Number(manualLongitude),
    };
    if (
      !manualLatitude.trim() ||
      !manualLongitude.trim() ||
      !isWithinAlbay(next.latitude, next.longitude)
    ) {
      setError("Enter valid coordinates within Albay.");
      return;
    }
    moveTo(next);
    setSearchView(false);
  };
  const openSearch = () => {
    setInitialCamera({ center: [coordinates.longitude, coordinates.latitude], zoom: zoom.current });
    setSearchView(true);
  };
  const Map = module?.Map,
    Camera = module?.Camera,
    UserLocation = module?.UserLocation;
  const address = resolved
    ? [
        resolved.purok,
        meta.barangays.find((item) => item.code === resolved.barangayPsgc)
          ?.name,
        meta.municipalities.find(
          (item) => item.code === resolved.municipalityCode,
        )?.name,
      ]
        .filter(Boolean)
        .join(", ")
    : "Move the map to identify the issue location";
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => (searchView ? setSearchView(false) : onClose())}
    >
      <ReportPage
        title={searchView ? "Find a location" : "Choose location"}
        onBack={() => (searchView ? setSearchView(false) : onClose())}
        scroll={searchView}
      >
        {searchView ? (
          <>
            <Input
              label="Search within Albay"
              value={query}
              onChangeText={setQuery}
              placeholder="Street, barangay, or landmark"
              startContent={<Search size={18} color={foreground} />}
              onSubmitEditing={() => void search()}
            />
            <Field>
              <Field.Label>Municipality</Field.Label>
              <Select
                presentation="inline"
                searchable
                value={municipality || undefined}
                placeholder="Choose municipality"
                onValueChange={(value) => {
                  setMunicipality(value);
                  setBarangay("");
                }}
              >
                {meta.municipalities.map((item) => (
                  <Select.Item
                    key={item.code}
                    value={item.code}
                    label={item.name}
                  />
                ))}
              </Select>
            </Field>
            <Field>
              <Field.Label>Barangay</Field.Label>
              <Select
                presentation="inline"
                searchable
                disabled={!municipality}
                value={barangay || undefined}
                placeholder="Choose barangay"
                onValueChange={setBarangay}
              >
                {meta.barangays
                  .filter((item) => item.municipalityCode === municipality)
                  .map((item) => (
                    <Select.Item
                      key={item.code}
                      value={item.code}
                      label={item.name}
                    />
                  ))}
              </Select>
            </Field>
            <Button loading={searching} onPress={() => void search()}>
              Find address
            </Button>
            {fixture ? (
              <Field>
                <Field.Label>Visual fixture map state</Field.Label>
                <Select
                  presentation="inline"
                  placeholder="Preview a map state"
                  onValueChange={(value) => {
                    setSearchView(false);
                    if (value === "outside")
                      moveTo({ latitude: 14, longitude: 123.7 });
                    else if (value === "denied")
                      setError(
                        "Location access was denied. Move the map manually or search an address.",
                      );
                    else if (value === "unavailable")
                      setMapError(
                        "Map unavailable. Retry or search an address.",
                      );
                    else moveTo(creationFixtureLocation);
                  }}
                >
                  <Select.Item value="ready" label="Confirmed Albay location" />
                  <Select.Item value="outside" label="Outside Albay" />
                  <Select.Item value="denied" label="Location access denied" />
                  <Select.Item value="unavailable" label="Map unavailable" />
                </Select>
              </Field>
            ) : null}
            {mapError || Platform.OS === "web" ? (
              <>
                <Text muted size="sm">
                  You can enter known coordinates. The point must match an Albay
                  barangay before you can use it.
                </Text>
                <Input
                  label="Latitude"
                  value={manualLatitude}
                  onChangeText={setManualLatitude}
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Longitude"
                  value={manualLongitude}
                  onChangeText={setManualLongitude}
                  keyboardType="decimal-pad"
                />
                <Button variant="secondary" onPress={manualPin}>
                  Check coordinates
                </Button>
              </>
            ) : null}
            {error ? (
              <Text
                size="sm"
                className="text-destructive"
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}
          </>
        ) : (
          <View className="flex-1 -mx-4 -mt-3 bg-muted">
            {Platform.OS === "web" && !mapError ? (
              <WebLocationMap
                key={retry}
                ref={webCamera}
                latitude={coordinates.latitude}
                longitude={coordinates.longitude}
                maxBounds={REPORT_MAP_BOUNDS}
                minZoom={REPORT_MAP_MIN_ZOOM}
                maxZoom={REPORT_MAP_MAX_ZOOM}
                userLocation={userLocation}
                onReady={() => setReady(true)}
                onError={() =>
                  setMapError(
                    "Map unavailable. Retry or enter known coordinates.",
                  )
                }
                onChange={(point) => {
                  if (!busy.current) {
                    setCoordinates(point);
                    setError(null);
                  }
                }}
              />
            ) : Map && Camera && !mapError ? (
              <Map
                key={retry}
                style={{ flex: 1 }}
                androidView="texture"
                mapStyle={MAP_STYLE_URL}
                dragPan={!locating}
                touchZoom={!locating}
                touchRotate={false}
                touchPitch={false}
                compass={false}
                logo={false}
                attribution
                onDidFinishLoadingStyle={() => setReady(true)}
                onDidFinishLoadingMap={() => setReady(true)}
                onDidFailLoadingMap={() =>
                  setMapError("Map unavailable. Retry or search an address.")
                }
                onRegionDidChange={(event) => {
                  if (busy.current) return;
                  const [longitude, latitude] = event.nativeEvent.center;
                  setError(null);
                  setCoordinates((current) =>
                    Math.abs(current.latitude - latitude) +
                      Math.abs(current.longitude - longitude) <
                    0.0000001
                      ? current
                      : { latitude, longitude },
                  );
                }}
              >
                <Camera
                  ref={camera}
                  initialViewState={initialCamera}
                  maxBounds={REPORT_MAP_BOUNDS}
                  minZoom={REPORT_MAP_MIN_ZOOM}
                  maxZoom={REPORT_MAP_MAX_ZOOM}
                />
                {locationAllowed && !fixture && UserLocation ? <UserLocation accuracy /> : null}
              </Map>
            ) : (
              <View className="flex-1 items-center justify-center gap-3 px-8">
                <MapPin size={36} color={primary} />
                <Text muted size="sm" className="text-center">
                  {mapError ??
                    "The map is loading. You can also search an address or enter known coordinates."}
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setInitialCamera({ center: [coordinates.longitude, coordinates.latitude], zoom: zoom.current });
                    setReady(false);
                    setMapError(null);
                    setRetry((current) => current + 1);
                  }}
                >
                  Retry map
                </Button>
                <Button onPress={openSearch}>
                  Find a location
                </Button>
              </View>
            )}
            {!ready && !mapError ? (
              <View pointerEvents="none" className="absolute inset-0"><Skeleton animated={focused} label="Loading map" className="absolute inset-0" /></View>
            ) : null}
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center"
            >
              <MapPin
                size={46}
                color={primary}
                fill={primary}
                strokeWidth={1}
              />
            </View>
            <View className="absolute inset-x-4 top-3 gap-2">
              <Button
                variant="outline"
                className="bg-card justify-start"
                startContent={<Search size={18} color={foreground} />}
                onPress={openSearch}
              >
                Search within Albay
              </Button>
              <View className="rounded-xl bg-card p-3 gap-1">
                <Text size="sm">Move the map to position the pin.</Text>
                <Text size="xs" muted>
                  Pinch to zoom. Your draft is kept when you go back.
                </Text>
              </View>
            </View>
            <View className="absolute right-4 top-1/2 gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="bg-card rounded-xl"
                accessibilityLabel="Use current location"
                loading={locating}
                onPress={() => void locate()}
              >
                <LocateFixed size={20} color={foreground} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="bg-card rounded-xl"
                accessibilityLabel="Zoom in"
                onPress={() => {
                  zoom.current = Math.min(REPORT_MAP_MAX_ZOOM, zoom.current + 1);
                  (Platform.OS === "web"
                    ? webCamera.current
                    : camera.current
                  )?.zoomTo(zoom.current);
                }}
              >
                <Plus size={20} color={foreground} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="bg-card rounded-xl"
                accessibilityLabel="Zoom out"
                onPress={() => {
                  zoom.current = Math.max(REPORT_MAP_MIN_ZOOM, zoom.current - 1);
                  (Platform.OS === "web"
                    ? webCamera.current
                    : camera.current
                  )?.zoomTo(zoom.current);
                }}
              >
                <Minus size={20} color={foreground} />
              </Button>
            </View>
            <View className="absolute inset-x-4 bottom-8 rounded-xl bg-card p-4 gap-2">
              <View className="flex-row items-center justify-between" style={{ minHeight: 20 }}>
                <Text muted size="xs">Issue location</Text>
                {resolving || locating ? <Spinner size="sm" label={locating ? "Finding your location" : "Confirming address"} /> : null}
              </View>
              <Text weight="semibold" size="sm" numberOfLines={2}>{address}</Text>
              <View className="flex-row gap-2 items-center" style={{ minHeight: 20 }}>
                <Text size="xs" muted>{locating ? "Finding your location" : resolving ? "Confirming Albay address…" : "Pin location"}</Text>
              </View>
              <Text size="xs" muted>
                {fixture
                  ? "Illustrative visual fixture · no device location used"
                  : "Albay · Adjust the pin to the issue."}
              </Text>
              {error ? (
                <Text
                  size="xs"
                  className="text-destructive"
                  accessibilityRole="alert"
                >
                  {error}
                </Text>
              ) : null}
              <Button
                disabled={!resolved || resolving || locating || Boolean(error)}
                onPress={() => {
                  if (resolved && !resolving && !locating && !error)
                    onConfirm(resolved);
                }}
              >
                Use this location
              </Button>
            </View>
          </View>
        )}
      </ReportPage>
    </Modal>
  );
}
