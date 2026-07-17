import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
  type NotificationSubstation,
} from "@/services/notification-settings";
import {
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Minus,
  RadioTower,
  Save,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";

type ParentState = "none" | "partial" | "all";
type Notice = {
  status: "success" | "danger";
  title: string;
  description: string;
};

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

function TriStateCheckbox({
  state,
  onPress,
  accessibilityLabel,
}: {
  state: ParentState;
  onPress: () => void;
  accessibilityLabel: string;
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
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === "partial" ? "mixed" : checked }}
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
    <View className="h-11 w-14 justify-center" style={{ pointerEvents: "none" }}>
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
        <Text className="text-xs text-muted-foreground">
          {description}
        </Text>
      </View>
      <ToggleSwitch value={value} />
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View className="gap-3">
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-14 rounded-[20px]" />
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
    </View>
  );
}

export default function PushNotificationsRoute() {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  const floatingShadow = useCSSVariable("--shadow-floating-bar");
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
  const [notice, setNotice] = useState<Notice | null>(null);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  const selectedCount = selectedFeederIds.size;
  const totalFeederCount = useMemo(
    () =>
      settings?.substations.reduce(
        (sum, substation) => sum + substation.feeders.length,
        0,
      ) ?? 0,
    [settings],
  );
  const selectionPercent =
    totalFeederCount > 0 ? Math.round((selectedCount / totalFeederCount) * 100) : 0;

  const load = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    const next = await fetchNotificationSettings();
    setSettings(next);
    setReceivePushNotifications(next.preferences.receivePushNotifications);
    setReceiveAdvisories(next.preferences.receiveAdvisories);
    const selected = makeInitialSelection(next);
    setSelectedFeederIds(selected);
    setExpandedSubstationIds(
      new Set(next.substations.map((substation) => substation.id)),
    );
    setIsLoading(false);
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

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleSubstation = (substation: NotificationSubstation) => {
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
    setSelectedFeederIds(new Set());
  };

  const save = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const compact = compactSelection(settings.substations, selectedFeederIds);
      const next = await saveNotificationSettings({
        receivePushNotifications,
        receiveAdvisories,
        ...compact,
      });
      setSettings(next);
      setSelectedFeederIds(makeInitialSelection(next));
      setNotice({
        status: "success",
        title: "Saved",
        description: "Notification settings updated.",
      });
    } catch (error) {
      setNotice({
        status: "danger",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsSaving(false);
    }
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
          paddingBottom: bottomPadding + 120,
        }}
      >
        <View className="rounded-lg border border-border bg-card p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
              <BellRing size={22} color={accentColor} />
            </View>
            <View className="flex-1">
              <Heading size="md">
                Alert preferences
              </Heading>
              <Text className="text-xs text-muted-foreground">
                Choose which grid updates should reach this device.
              </Text>
            </View>
          </View>
          <View className="mt-4 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-muted-foreground">
                {selectedCount}/{totalFeederCount} feeders
              </Text>
              <Text className="text-xs font-medium text-muted-foreground">
                {selectionPercent}%
              </Text>
            </View>
            <Progress value={selectionPercent}>
              <ProgressFilledTrack />
            </Progress>
          </View>
        </View>

        {notice ? (
          <Alert variant={notice.status === "danger" ? "destructive" : "default"}>
            <View className="flex-1 gap-1">
              <AlertText className="font-bold">{notice.title}</AlertText>
              <AlertText>{notice.description}</AlertText>
            </View>
          </Alert>
        ) : null}

        <View className="gap-3 rounded-lg border border-border bg-card p-4">
          <PreferenceSwitch
            icon={<BellRing size={20} color={accentColor} />}
            title="Push notifications"
            description="Send device notifications when updates are available."
            value={receivePushNotifications}
            onChange={setReceivePushNotifications}
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
            <Text className="text-sm text-muted-foreground">Substations and feeders</Text>
            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant="ghost"
                onPress={clearAllFeeders}
                isDisabled={isLoading || !settings || selectedCount === 0}
                accessibilityLabel="Clear feeder selections"
              >
                <ButtonText>Clear</ButtonText>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={selectAllFeeders}
                isDisabled={
                  isLoading ||
                  !settings ||
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
                  <View key={substation.id} className="rounded-lg border border-border bg-card p-3">
                    <View className="flex-row items-center gap-3">
                      <TriStateCheckbox
                        state={state}
                        onPress={() => toggleSubstation(substation)}
                        accessibilityLabel={`Select ${substation.name}`}
                      />
                      <Pressable
                        className="min-h-12 flex-1 justify-center"
                        onPress={() => toggleSubstation(substation)}
                        accessibilityRole="button"
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
                        onPress={() => toggleExpanded(substation.id)}
                        accessibilityLabel={
                          expanded ? "Collapse feeders" : "Expand feeders"
                        }
                      >
                        {expanded ? (
                          <ButtonIcon as={ChevronDown} height={18} width={18} />
                        ) : (
                          <ButtonIcon as={ChevronRight} height={18} width={18} />
                        )}
                      </Button>
                    </View>

                    {expanded ? (
                      <View className="mt-2 gap-1 border-t border-border pt-2">
                        {substation.feeders.map((feeder) => (
                          <Pressable
                            key={feeder.id}
                            onPress={() => toggleFeeder(feeder.id)}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: selectedFeederIds.has(feeder.id),
                            }}
                            accessibilityLabel={`Select ${feeder.name}`}
                            className="min-h-10 flex-row items-center gap-1"
                          >
                            <FeederCheckbox
                              selected={selectedFeederIds.has(feeder.id)}
                            />
                            <View className="flex-1 flex-row items-center gap-2">
                              <RadioTower size={16} color={mutedColor} />
                              <Text className="font-medium text-foreground">{feeder.name}</Text>
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

      <View
        className="absolute inset-x-0 bottom-0 items-end px-5"
        style={{
          paddingBottom: Math.max(insets.bottom, 14),
          pointerEvents: "box-none",
        }}
      >
        {/* Floating save button stays above the tab bar and scroll content. */}
        <Button
          size="lg"
          onPress={save}
          isDisabled={isSaving || isLoading || !settings}
          className="rounded-full px-5"
          style={{
            width: 168,
            boxShadow:
              typeof floatingShadow === "string" ? floatingShadow : undefined,
          }}
        >
          <ButtonIcon as={Save} height={18} width={18} />
          <ButtonText>{isSaving ? "Saving..." : "Save"}</ButtonText>
        </Button>
      </View>
    </View>
  );
}
