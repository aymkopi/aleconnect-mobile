import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  fetchNotificationSettings,
  readCachedNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
  type NotificationSubstation,
  type SaveNotificationSettingsInput,
} from "@/services/notification-settings";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import {
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Minus,
  RadioTower,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";

type ParentState = "none" | "partial" | "all";
type Notice = {
  status: "success" | "danger";
  title: string;
  description: string;
};
type OsPermissionState = "granted" | "denied" | "undetermined" | "unavailable";

function makeInitialSelection(settings: NotificationSettings) {
  const selected = new Set(settings.selectedFeederIds);
  for (const substation of settings.substations) {
    if (settings.selectedSubstationIds.includes(substation.id)) {
      substation.feeders.forEach((feeder) => selected.add(feeder.id));
    }
  }
  return selected;
}

function parentState(
  substation: NotificationSubstation,
  selectedFeederIds: Set<string>,
): ParentState {
  const selectedCount = substation.feeders.filter((feeder) =>
    selectedFeederIds.has(feeder.id),
  ).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === substation.feeders.length) return "all";
  return "partial";
}

function compactSelection(
  substations: NotificationSubstation[],
  selectedFeederIds: Set<string>,
) {
  const selectedSubstationIds: string[] = [];
  const selectedPartialFeederIds: string[] = [];

  for (const substation of substations) {
    const state = parentState(substation, selectedFeederIds);
    if (state === "all" && substation.feeders.length > 0) {
      selectedSubstationIds.push(substation.id);
      continue;
    }
    for (const feeder of substation.feeders) {
      if (selectedFeederIds.has(feeder.id))
        selectedPartialFeederIds.push(feeder.id);
    }
  }

  return { selectedSubstationIds, selectedFeederIds: selectedPartialFeederIds };
}

function buildSavePayload(
  settings: NotificationSettings,
  selectedFeederIds: Set<string>,
  receivePushNotifications: boolean,
  receiveAdvisories: boolean,
): SaveNotificationSettingsInput {
  return {
    receivePushNotifications,
    receiveAdvisories,
    ...compactSelection(settings.substations, selectedFeederIds),
  };
}

function TriStateCheckbox({
  state,
  onPress,
  accessibilityLabel,
  disabled = false,
}: {
  state: ParentState;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const [accentColor, accentForeground, borderColor] = useAppColors([
    "accent",
    "accent-foreground",
    "border",
  ]);
  const checked = state !== "none";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: state === "partial" ? "mixed" : checked,
        disabled,
      }}
      accessibilityLabel={accessibilityLabel}
      className="h-11 w-11 items-center justify-center"
    >
      <View
        className="h-6 w-6 items-center justify-center rounded-lg"
        style={{
          backgroundColor: checked ? accentColor : "transparent",
          borderColor: checked ? accentColor : borderColor,
          borderWidth: 1,
        }}
      >
        {state === "partial" ? (
          <Minus size={15} color={accentForeground} />
        ) : null}
        {state === "all" ? <Check size={15} color={accentForeground} /> : null}
      </View>
    </Pressable>
  );
}

function FeederCheckbox({ selected }: { selected: boolean }) {
  const [accentColor, accentForeground, borderColor] = useAppColors([
    "accent",
    "accent-foreground",
    "border",
  ]);
  return (
    <View
      className="h-11 w-11 items-center justify-center"
      style={{ pointerEvents: "none" }}
    >
      <View
        className="h-6 w-6 items-center justify-center rounded-lg"
        style={{
          backgroundColor: selected ? accentColor : "transparent",
          borderColor: selected ? accentColor : borderColor,
          borderWidth: 1,
        }}
      >
        {selected ? <Check size={15} color={accentForeground} /> : null}
      </View>
    </View>
  );
}

function ToggleSwitch({ value }: { value: boolean }) {
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  return (
    <View
      className="h-11 w-14 justify-center"
      style={{ pointerEvents: "none" }}
    >
      <View
        className="h-8 rounded-full p-1"
        style={{ backgroundColor: value ? accentColor : mutedColor }}
      >
        <View
          className="h-6 w-6 rounded-full bg-background"
          style={{ alignSelf: value ? "flex-end" : "flex-start" }}
        />
      </View>
    </View>
  );
}

function PreferenceSwitch({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      className="min-h-14 flex-row items-center gap-3"
    >
      <View className="h-11 w-8 items-center justify-center">{icon}</View>
      <View className="flex-1">
        <Text className="font-medium text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{description}</Text>
      </View>
      <ToggleSwitch value={value} />
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View className="gap-3">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </View>
  );
}

export default function PushNotificationsRoute() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [accentColor, mutedColor] = useAppColors([
    "accent",
    "muted-foreground",
  ]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [receivePushNotifications, setReceivePushNotifications] =
    useState(true);
  const [receiveAdvisories, setReceiveAdvisories] = useState(true);
  const [selectedFeederIds, setSelectedFeederIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSubstationIds, setExpandedSubstationIds] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveRetry, setSaveRetry] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [osPermission, setOsPermission] =
    useState<OsPermissionState>("undetermined");
  const [canAskPermission, setCanAskPermission] = useState(true);
  const [isOffline, setIsOffline] = useState(true);
  const [isNetworkKnown, setIsNetworkKnown] = useState(false);
  const [isUsingCachedSettings, setIsUsingCachedSettings] = useState(false);
  const [hasReconnectedPendingRefresh, setHasReconnectedPendingRefresh] =
    useState(false);
  const savedSignatureRef = useRef("");
  const saveRevisionRef = useRef(0);
  const wasOfflineRef = useRef<boolean | null>(null);
  const bottomPadding = Math.max(insets.bottom, 16);

  const selectedCount = selectedFeederIds.size;
  const totalFeederCount = useMemo(
    () =>
      settings?.substations.reduce(
        (sum, substation) => sum + substation.feeders.length,
        0,
      ) ?? 0,
    [settings],
  );
  const draftPayload = useMemo(
    () =>
      settings
        ? buildSavePayload(
            settings,
            selectedFeederIds,
            receivePushNotifications,
            receiveAdvisories,
          )
        : null,
    [receiveAdvisories, receivePushNotifications, selectedFeederIds, settings],
  );
  const draftSignature = draftPayload ? JSON.stringify(draftPayload) : "";
  const isFeederEditingDisabled =
    isLoading ||
    !settings ||
    !isNetworkKnown ||
    isOffline ||
    hasReconnectedPendingRefresh ||
    isUsingCachedSettings;

  const refreshOsPermission = useCallback(async () => {
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      setOsPermission("unavailable");
      return;
    }

    try {
      const permission = await Notifications.getPermissionsAsync();
      setOsPermission(
        permission.granted
          ? "granted"
          : permission.status === "denied"
            ? "denied"
            : "undetermined",
      );
      setCanAskPermission(permission.canAskAgain);
    } catch {
      setOsPermission("unavailable");
    }
  }, []);

  const requestOsPermission = useCallback(async () => {
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;

    try {
      if (osPermission === "denied" && !canAskPermission) {
        await Linking.openSettings();
        return;
      }

      const permission = await Notifications.requestPermissionsAsync();
      setOsPermission(
        permission.granted
          ? "granted"
          : permission.status === "denied"
            ? "denied"
            : "undetermined",
      );
      setCanAskPermission(permission.canAskAgain);
    } catch {
      setOsPermission("unavailable");
      return;
    }
  }, [canAskPermission, osPermission]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/profile");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack]),
  );

  useEffect(() => {
    void refreshOsPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshOsPermission();
    });
    return () => subscription.remove();
  }, [refreshOsPermission]);

  const load = useCallback(async () => {
  if (!session) {
    setIsLoading(false);
    return;
  }

  const applySettings = (
    next: NotificationSettings & { isStale?: boolean },
  ) => {
    const selected = makeInitialSelection(next);
    const receivePush = next.preferences.receivePushNotifications;
    const receiveAdvisoriesNext = next.preferences.receiveAdvisories;

    savedSignatureRef.current = JSON.stringify(
      buildSavePayload(next, selected, receivePush, receiveAdvisoriesNext),
    );
    setSettings(next);
    setReceivePushNotifications(receivePush);
    setReceiveAdvisories(receiveAdvisoriesNext);
    setSelectedFeederIds(selected);
    setExpandedSubstationIds(
      new Set(next.substations.map((substation) => substation.id)),
    );
    setIsUsingCachedSettings(Boolean(next.isStale));
    setNotice(null);
    setHasHydrated(true);
    setIsLoading(false);
  };

  setHasHydrated(false);

  const networkState = await NetInfo.fetch();
  const offline =
    networkState.isConnected === false ||
    networkState.isInternetReachable === false;

  setIsNetworkKnown(true);
  setIsOffline(offline);

  if (offline) {
    const cached = await readCachedNotificationSettings(session.user.id);
    if (!cached) {
      throw new Error(
        "Connect to the internet to load notification settings for the first time.",
      );
    }

    applySettings(cached);
    return;
  }

  const next = await fetchNotificationSettings(session.user.id);
  applySettings(next);
}, [session]);

  useEffect(() => {
    void load().catch((error) => {
      setIsLoading(false);
      setNotice({
        status: "danger",
        title: "Unable to load settings",
        description: error instanceof Error ? error.message : "Try again.",
      });
    });
  }, [load]);

  useEffect(() => {
    const networkSubscription = NetInfo.addEventListener((state) => {
      const nextOffline =
        state.isConnected === false || state.isInternetReachable === false;
      const previousOffline = wasOfflineRef.current;

      wasOfflineRef.current = nextOffline;
      setIsNetworkKnown(true);
      setIsOffline(nextOffline);

      if (previousOffline === true && !nextOffline) {
        setHasReconnectedPendingRefresh(true);
        void load()
          .catch((error) => {
            setNotice({
              status: "danger",
              title: "Unable to refresh settings",
              description:
                error instanceof Error ? error.message : "Try again.",
            });
          })
          .finally(() => {
            setHasReconnectedPendingRefresh(false);
          });
      }
    });

    return networkSubscription;
  }, [load]);

  useEffect(() => {
    if (
      !hasHydrated ||
      !session ||
      !draftPayload ||
      draftSignature === savedSignatureRef.current
    ) {
      return;
    }

    const revision = ++saveRevisionRef.current;
    setIsSaving(true);
    const timer = setTimeout(() => {
      void saveNotificationSettings(session.user.id, draftPayload)
        .then((next) => {
          if (revision !== saveRevisionRef.current) return;
          savedSignatureRef.current = draftSignature;
          setSettings(next);
          setIsUsingCachedSettings(Boolean(next.isStale));
          setNotice(null);
        })
        .catch((error) => {
          if (revision !== saveRevisionRef.current) return;
          setNotice({
            status: "danger",
            title: "Autosave failed",
            description:
              error instanceof Error ? error.message : "Try saving again.",
          });
        })
        .finally(() => {
          if (revision === saveRevisionRef.current) setIsSaving(false);
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [draftPayload, draftSignature, hasHydrated, saveRetry, session]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleSubstation = (substation: NotificationSubstation) => {
    if (isFeederEditingDisabled) return;

    setSelectedFeederIds((current) => {
      const next = new Set(current);
      const state = parentState(substation, current);
      for (const feeder of substation.feeders) {
        if (state === "all") next.delete(feeder.id);
        else next.add(feeder.id);
      }
      return next;
    });
  };

  const toggleFeeder = (feederId: string) => {
    if (isFeederEditingDisabled) return;

    setSelectedFeederIds((current) => {
      const next = new Set(current);
      if (next.has(feederId)) next.delete(feederId);
      else next.add(feederId);
      return next;
    });
  };

  const toggleExpanded = (substationId: string) => {
    setExpandedSubstationIds((current) => {
      const next = new Set(current);
      if (next.has(substationId)) next.delete(substationId);
      else next.add(substationId);
      return next;
    });
  };

  const selectAllFeeders = () => {
    if (isFeederEditingDisabled) return;
    if (!settings) return;

    setSelectedFeederIds(
      new Set(
        settings.substations.flatMap((substation) =>
          substation.feeders.map((feeder) => feeder.id),
        ),
      ),
    );
  };

  const clearAllFeeders = () => {
    if (isFeederEditingDisabled) return;
    setSelectedFeederIds(new Set());
  };

  if (!isSessionLoading && !session) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ width }}
      >
        <View className="w-full items-center rounded-lg border border-border bg-card p-6">
          <BellRing size={28} color={accentColor} />
          <Heading className="mt-4 text-center" size="md">
            Sign in required
          </Heading>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to manage feeder and substation alerts.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ChildAppBar
        title="Notification settings"
        description="Choose which consumer updates reach this device"
        onBack={handleBack}
        rightActions={
          <Text
            className="text-xs font-semibold text-muted-foreground"
            accessibilityLiveRegion="polite"
          >
            {isLoading
              ? "Loading..."
              : isSaving
                ? "Saving..."
                : notice?.status === "danger"
                  ? "Not saved"
                  : "Saved"}
          </Text>
        }
      />
      <ScrollView
        className="bg-background"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: bottomPadding + 24,
        }}
      >
        <View className="rounded-lg border border-border bg-card p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
              <BellRing size={22} color={accentColor} />
            </View>

            <View className="flex-1">
              <Heading size="md">Alert preferences</Heading>

              <Text className="text-xs text-muted-foreground">
                Changes save automatically.
              </Text>
            </View>

            <View className="items-end">
              <Heading className="text-2xl font-bold text-foreground">
                {selectedCount}/{totalFeederCount}
              </Heading>

              <Text className="text-xs font-medium text-muted-foreground">
                feeders
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
            <BellRing size={20} color={accentColor} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-semibold text-foreground">
              Device permission
            </Text>
            <Text className="text-xs text-muted-foreground">
              {osPermission === "granted"
                ? "Allowed by this device"
                : osPermission === "denied"
                  ? "Blocked by this device"
                  : osPermission === "unavailable"
                    ? "Available in the installed mobile app"
                    : "Permission has not been requested"}
            </Text>
          </View>
          {osPermission !== "granted" && osPermission !== "unavailable" ? (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11"
              onPress={() => void requestOsPermission()}
              accessibilityLabel={
                osPermission === "denied" && !canAskPermission
                  ? "Open notification settings"
                  : "Allow notification permission"
              }
            >
              <ButtonText>
                {osPermission === "denied" && !canAskPermission
                  ? "Settings"
                  : "Allow"}
              </ButtonText>
            </Button>
          ) : null}
        </View>

        {isNetworkKnown && isOffline && settings ? (
          <Alert>
            <View className="flex-1 gap-1">
              <AlertText className="font-bold">Offline feeder settings</AlertText>
              <AlertText>
                Offline — showing your last saved feeder settings. Reconnect to
                make changes.
              </AlertText>
            </View>
          </Alert>
        ) : !isOffline && isUsingCachedSettings && settings ? (
          <Alert>
            <View className="flex-1 gap-1">
              <AlertText className="font-bold">Saved feeder settings</AlertText>
              <AlertText>
                Showing your last saved feeder settings. Live settings are
                temporarily unavailable.
              </AlertText>
            </View>
          </Alert>
        ) : null}

        {notice ? (
          <Alert
            variant={notice.status === "danger" ? "destructive" : "default"}
          >
            <View className="flex-1 gap-1">
              <AlertText className="font-bold">{notice.title}</AlertText>
              <AlertText>{notice.description}</AlertText>
              {notice.status === "danger" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 min-h-11 self-start"
                  onPress={() => setSaveRetry((current) => current + 1)}
                  accessibilityLabel="Retry saving notification settings"
                >
                  <ButtonText>Retry</ButtonText>
                </Button>
              ) : null}
            </View>
          </Alert>
        ) : null}

        <View className="gap-3 rounded-lg border border-border bg-card p-4">
          <PreferenceSwitch
            icon={<BellRing size={20} color={accentColor} />}
            title="Push notifications"
            description="Send device notifications when updates are available."
            value={receivePushNotifications}
            onChange={(value) => {
              setReceivePushNotifications(value);
              if (value && osPermission !== "granted") {
                void requestOsPermission();
              }
            }}
          />
          <PreferenceSwitch
            icon={<Zap size={20} color={accentColor} />}
            title="Power advisories"
            description="Include outage, restoration, and feeder advisories."
            value={receiveAdvisories}
            onChange={setReceiveAdvisories}
          />
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between px-2">
            <Text className="text-sm text-muted-foreground">
              Substations and feeders
            </Text>
            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11"
                onPress={clearAllFeeders}
                isDisabled={isFeederEditingDisabled || selectedCount === 0}
                accessibilityLabel="Clear feeder selections"
              >
                <ButtonText>Clear</ButtonText>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="min-h-11"
                onPress={selectAllFeeders}
                isDisabled={
                  isFeederEditingDisabled ||
                  totalFeederCount === 0 ||
                  selectedCount === totalFeederCount
                }
                accessibilityLabel="Select all feeders"
              >
                <ButtonIcon as={CheckCheck} height={15} width={15} />
                <ButtonText>All</ButtonText>
              </Button>
            </View>
          </View>
          {isLoading ? <LoadingState /> : null}
          {!isLoading && settings ? (
            <View className="gap-3">
              {settings.substations.map((substation) => {
                const state = parentState(substation, selectedFeederIds);
                const expanded = expandedSubstationIds.has(substation.id);
                const selectedInGroup = substation.feeders.filter((feeder) =>
                  selectedFeederIds.has(feeder.id),
                ).length;

                return (
                  <View
                    key={substation.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <TriStateCheckbox
                        state={state}
                        onPress={() => toggleSubstation(substation)}
                        accessibilityLabel={`Select ${substation.name}`}
                        disabled={isFeederEditingDisabled}
                      />
                      <Pressable
                        className="min-h-12 flex-1 justify-center"
                        onPress={() => toggleSubstation(substation)}
                        disabled={isFeederEditingDisabled}
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled: isFeederEditingDisabled,
                        }}
                        accessibilityLabel={`Toggle ${substation.name}`}
                      >
                        <Text className="text-sm font-bold text-foreground">
                          {substation.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {selectedInGroup}/{substation.feeders.length} feeders
                        </Text>
                      </Pressable>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="min-h-11 min-w-11 rounded-full"
                        onPress={() => toggleExpanded(substation.id)}
                        accessibilityLabel={
                          expanded ? "Collapse feeders" : "Expand feeders"
                        }
                      >
                        {expanded ? (
                          <ButtonIcon as={ChevronDown} height={18} width={18} />
                        ) : (
                          <ButtonIcon
                            as={ChevronRight}
                            height={18}
                            width={18}
                          />
                        )}
                      </Button>
                    </View>

                    {expanded ? (
                      <View className="mt-2 gap-1 border-t border-border pt-2">
                        {substation.feeders.map((feeder) => (
                          <Pressable
                            key={feeder.id}
                            onPress={() => toggleFeeder(feeder.id)}
                            disabled={isFeederEditingDisabled}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: selectedFeederIds.has(feeder.id),
                              disabled: isFeederEditingDisabled,
                            }}
                            accessibilityLabel={`Select ${feeder.name}`}
                            className="min-h-11 flex-row items-center gap-1"
                          >
                            <FeederCheckbox
                              selected={selectedFeederIds.has(feeder.id)}
                            />
                            <View className="flex-1 flex-row items-center gap-2">
                              <RadioTower size={16} color={mutedColor} />
                              <Text className="font-medium text-foreground">
                                {feeder.name}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
