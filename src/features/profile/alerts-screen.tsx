import { useEffect, useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { Bell, ChevronLeft, Check, Search, X, Zap } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Checkbox } from "@/components/panelui/checkbox";
import { Switch } from "@/components/panelui/switch";
import { Text } from "@/components/panelui/text";
import { Spinner } from "@/components/panelui/spinner";
import { DataState, DataNotice } from "@/components/data-state";
import { InputGroup } from "@/components/panelui/input-group";
import { ReportPage } from "@/features/reports/components/report-page";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  registerDevicePushToken,
  type NotificationSettingsResult,
} from "@/services/notification-settings";
import { registerForPushNotificationsAsync, requestPushNotificationPermissionAsync } from "@/services/push-notifications";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import {
  ProfileGate,
  ProfileNotice,
  useProfileTask,
  useProfileBackGuard,
  type ProfileIdentity,
} from "./profile-ui";
import { profileFixtureSettings } from "./profile-fixtures";
import { expandAreas, compactAreas } from "./profile-state";
function payload(value: NotificationSettingsResult) {
  return {
    ...value.preferences,
    selectedSubstationIds: value.selectedSubstationIds,
    selectedFeederIds: value.selectedFeederIds,
  };
}
export default function AlertsScreen() {
  return <ProfileGate>{(identity) => <Alerts identity={identity} />}</ProfileGate>;
}
function Alerts({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(),
    current = useProfileTask(identity),
    [primary, muted] = useAppColors(["primary", "muted-foreground"]);
  const read = useScopedRead(identity.key, () =>
    identity.fixture
      ? Promise.resolve(profileFixtureSettings)
      : fetchNotificationSettings(identity.principalId),
  );
  const [draft, setDraft] = useState<NotificationSettingsResult | null>(null),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [retry, setRetry] = useState(0),
    [online, setOnline] = useState(identity.fixture),
    [permission, setPermission] = useState(identity.fixture ? "Allowed" : "Checking"),
    [deviceBusy, setDeviceBusy] = useState(false),
    [deviceError, setDeviceError] = useState(""),
    [sheet, setSheet] = useState(false),
    [station, setStation] = useState(""),
    [areaQuery, setAreaQuery] = useState(""),
    [areaDraft, setAreaDraft] = useState<string[]>([]),
    [discard, setDiscard] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const hydrated = useRef<NotificationSettingsResult | null>(null);
  const { data: loaded, busy: loading, reload: refresh } = read;
  const signature = draft ? JSON.stringify(payload(draft)) : "",
    dirty = !!signature && signature !== saved;
  // Hydrate each new server snapshot once while preserving an unsaved draft.
  useEffect(() => {
    if (!loaded || loaded === hydrated.current) return;
    hydrated.current = loaded;
    if (!draft || !dirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate a new server snapshot without replacing unsaved edits.
      setDraft(loaded);
      setSaved(JSON.stringify(payload(loaded)));
    }
  }, [loaded, draft, dirty]); // Preserve unsaved drafts when a fresh snapshot arrives.
  useEffect(() => {
    if (identity.fixture) return;
    return NetInfo.addEventListener((s) => {
      setOnline(s.isConnected === true && s.isInternetReachable !== false);
    });
  }, [identity.fixture]);
  useEffect(() => {
    if (online && !identity.fixture) void refresh(true);
  }, [online, identity.fixture, refresh]);
  useEffect(() => {
    if (identity.fixture) return;
    async function check() {
      try {
        const p = await Notifications.getPermissionsAsync();
        if (current())
          setPermission(p.granted ? "Allowed" : p.canAskAgain ? "Not allowed" : "Blocked");
      } catch {
        if (current()) setPermission("Unavailable");
      }
    }
    void check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => sub.remove();
  }, [identity.fixture, current]);
  useEffect(() => {
    if (
      !draft ||
      !dirty ||
      saving ||
      error ||
      !online ||
      loading ||
      loaded?.isStale ||
      (PANELUI_PREVIEW && !identity.fixture)
    )
      return;
    const value = payload(draft),
      sig = JSON.stringify(value);
    const timer = setTimeout(() => {
      if (!current()) return;
      setSaving(true);
      void (
        identity.fixture
          ? Promise.resolve({ ...draft, isStale: false })
          : saveNotificationSettings(identity.principalId, value)
      )
        .then((next) => {
          if (current()) {
            if (!identity.fixture) void refresh(true);
            setSaved(JSON.stringify(payload(next)));
            setDraft((latest) =>
              latest && JSON.stringify(payload(latest)) !== sig ? latest : next,
            );
          }
        })
        .catch((e) => {
          if (current())
            setError(
              e instanceof Error
                ? e.message
                : "Your preferences were not saved. Retry when connected.",
            );
        })
        .finally(() => {
          if (current()) setSaving(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    draft,
    dirty,
    saving,
    error,
    online,
    loading,
    loaded?.isStale,
    identity.fixture,
    identity.principalId,
    current,
    refresh,
    retry,
  ]);
  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  }
  function back() {
    if (saving || deviceBusy) return;
    if (dirty) {
      setDiscard(true);
      return;
    }
    leave();
  }
  const allowLeave = useProfileBackGuard(saving || deviceBusy || dirty, back);
  const ids = draft
    ? expandAreas(draft.substations, draft.selectedSubstationIds, draft.selectedFeederIds)
    : [];
  const feeders =
    draft?.substations.flatMap((s) => s.feeders).filter((f) => ids.includes(f.id)) ?? [];
  function update(field: "receivePushNotifications" | "receiveAdvisories", value: boolean) {
    if (saving) return;
    setError("");
    setDraft((d) => (d ? { ...d, preferences: { ...d.preferences, [field]: value } } : d));
  }
  async function setup() {
    if (deviceBusy) return;
    setDeviceBusy(true);
    setDeviceError("");
    try {
      if (identity.fixture) {
        setPermission("Allowed");
        setDeviceRegistered(true);
        return;
      }
      if (PANELUI_PREVIEW) throw new Error("Live device registration is disabled in this preview.");
      const p = await requestPushNotificationPermissionAsync();
      if (!current()) return;
      setPermission(p.granted ? "Allowed" : p.canAskAgain ? "Not allowed" : "Blocked");
      if (!p.granted) throw new Error("Enable notifications in device settings to receive alerts.");
      const token = await registerForPushNotificationsAsync();
      if (!current()) return;
      if (!token)
        throw new Error("Device alert setup did not complete. Your saved preferences are kept.");
      const result = await registerDevicePushToken(token);
      if (current() && !result?.ok)
        throw new Error("This device could not be registered. Retry setup.");
      if (current()) setDeviceRegistered(true);
    } catch (e) {
      if (current()) setDeviceError(e instanceof Error ? e.message : "Device alert setup failed.");
    } finally {
      if (current()) setDeviceBusy(false);
    }
  }
  const selectedStation = draft?.substations.find((s) => s.id === station);
  const areaTerm = areaQuery.trim().toLocaleLowerCase();
  const matchesArea = (name: string) => name.toLocaleLowerCase().includes(areaTerm);
  const matchingStations = draft?.substations.filter((s) =>
    matchesArea(s.name) || s.feeders.some((f) => matchesArea(`${s.name} ${f.name}`)),
  ) ?? [];
  const matchingFeeders = (selectedStation ? [selectedStation] : draft?.substations ?? [])
    .flatMap((s) => s.feeders.filter((f) => matchesArea(`${s.name} ${f.name}`)));
  function chooseStation(value: string) {
    setStation(value);
    setAreaQuery("");
  }
  const changeIds = (values: string[]) => setAreaDraft([...new Set(values)]);
  return (
    <>
      <ReportPage title="Alerts & notifications" onBack={back}>
        <Text size="sm" muted>
          Choose which updates reach you.
        </Text>
        {!draft ? (
          loading ? <DataState loading loadingLayout="settings" title="Loading your notification settings" /> : <DataState title="Settings couldn’t load" description="Connect to load your preferences for the first time. Your saved choices have not been changed." actionLabel="Try again" onAction={() => void refresh(true)} />
        ) : (
          <>
            {!online || loaded?.isStale ? (
              <ProfileNotice
                title="Saved view · waiting for connection"
                description={
                  dirty
                    ? "Your changes are kept on this screen. They will save after a fresh server check."
                    : "Last saved settings are shown. Connect and refresh to make changes."
                }
              />
            ) : null}
            <Text size="sm" weight="semibold" accessibilityRole="header">
              Notifications
            </Text>
            <View className="gap-3 rounded-xl bg-card p-3">
              <View className="flex-row items-center gap-2">
                <Bell size={18} color={muted} />
                <View className="flex-1 gap-1">
                  <Text size="sm" weight="semibold">
                    Push notifications
                  </Text>
                  <Text size="xs" muted>
                    Device alerts for your enabled updates.
                  </Text>
                </View>
                <Switch
                  value={draft.preferences.receivePushNotifications}
                  disabled={saving}
                  accessibilityLabel="Push notifications"
                  onValueChange={(v) => update("receivePushNotifications", v)}
                />
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center gap-2">
                <Zap size={18} color={primary} />
                <View className="flex-1 gap-1">
                  <Text size="sm" weight="semibold">
                    Power advisories
                  </Text>
                  <Text size="xs" muted>
                    Outage, restoration and feeder advisories.
                  </Text>
                </View>
                <Switch
                  value={draft.preferences.receiveAdvisories}
                  disabled={saving}
                  accessibilityLabel="Power advisories"
                  onValueChange={(v) => update("receiveAdvisories", v)}
                />
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center gap-2">
                <Bell size={16} color={muted} />
                <Text size="xs" className="flex-1">
                  Device permission
                </Text>
                <Text size="xs" className="text-primary">
                  {permission}
                </Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                loading={deviceBusy}
                onPress={() =>
                  permission === "Blocked"
                    ? void Linking.openSettings().catch(() =>
                        setDeviceError("Open device settings to allow notifications."),
                      )
                    : void setup()
                }
              >
                {permission === "Blocked" ? "Open device settings" : "Set up device alerts"}
              </Button>
            </View>
            {deviceError ? (
              <ProfileNotice title="Device setup incomplete" description={deviceError} danger />
            ) : null}
            {deviceRegistered && permission === "Allowed" && !deviceBusy && !deviceError ? <Text size="xs" className="text-primary" accessibilityLiveRegion="polite">{identity.fixture ? "Visual fixture · device setup simulated" : "Device alerts are ready"}</Text> : null}
            <Text size="sm" weight="semibold" accessibilityRole="header">
              Broadcast areas
            </Text>
            <View className="gap-2 rounded-xl bg-card p-3">
              <View className="flex-row gap-2">
                <Text size="sm" weight="semibold" className="flex-1">
                  {draft.substations
                    .filter((s) => s.feeders.some((f) => ids.includes(f.id)))
                    .map((s) => s.name)
                    .join(" & ") || "Choose your service areas"}
                </Text>
                <View className="flex-row items-center gap-1" accessibilityLiveRegion="polite">
                  {saving || loading ? <Spinner size="sm" /> : !dirty && online && !loaded?.isStale && !error && !read.error ? <Check size={14} color={primary} /> : null}
                  <Text size="xs" className="text-primary">
                    {saving || loading ? "Syncing" : error || read.error ? "Not synced" : dirty || !online || loaded?.isStale ? "Pending sync" : identity.fixture ? "Local preview" : "Synced"}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {feeders.map((f) => (
                  <View key={f.id} className="rounded-lg bg-primary/10 px-3 py-1.5">
                    <Text size="xs" className="text-primary">
                      {f.name}
                    </Text>
                  </View>
                ))}
              </View>
              <Text size="xs" muted>
                ALECO broadcasts for your selected service areas.
              </Text>
              <Button
                variant="outline"
                disabled={saving}
                onPress={() => {
                  setAreaDraft(ids);
                  chooseStation("");
                  setSheet(true);
                }}
              >
                Choose areas
              </Button>
            </View>
            <Text size="xs" muted>
              Report updates follow your ALECO account. Broadcast alerts follow the areas you
              choose.
            </Text>
            <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2">
              {saving || loading ? <Spinner size="sm" /> : <Check size={14} color={muted} />}
              <Text size="xs" muted>
                {saving
                  ? "Saving preferences"
                  : dirty
                    ? "Unsaved changes"
                    : identity.fixture
                      ? "Visual fixture · changes stay local"
                      : "Preferences saved"}
                {deviceError ? " · Device setup pending" : ""}
              </Text>
            </View>
            {error ? (
              <>
                <ProfileNotice title="Preferences were not saved" description={error} danger />
                <Button
                  variant="outline"
                  onPress={() => {
                    setError("");
                    setRetry((v) => v + 1);
                    void refresh(true);
                  }}
                >
                  Retry saving
                </Button>
              </>
            ) : null}
            {read.error ? (
              <DataNotice title="Could not refresh preferences" description="Your saved choices and unsaved changes remain in place. Reconnect and refresh before making further changes." actionLabel="Refresh settings" busy={loading || saving} onAction={() => void refresh(true)} />
            ) : null}
            {loaded?.isStale && !read.error ? (
              <Button variant="outline" onPress={() => void refresh(true)}>
                Refresh saved settings
              </Button>
            ) : null}
          </>
        )}
      </ReportPage>
      <BottomSheet open={sheet} onOpenChange={(open) => {
        setSheet(open);
        if (!open) setAreaQuery("");
      }}>
        <BottomSheet.Content className="px-4" onBack={station ? () => chooseStation("") : undefined}>
          <BottomSheet.Header>
            <View className="flex-row gap-2 items-center">
              {station ? (
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel="Back to broadcast areas"
                  onPress={() => chooseStation("")}
                >
                  <ChevronLeft size={20} color={primary} />
                </Button>
              ) : null}
              <Text size="lg" weight="semibold">
                {selectedStation?.name ?? "Broadcast areas"}
              </Text>
            </View>
          </BottomSheet.Header>
          <BottomSheet.Body className="gap-3" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text size="lg" weight="semibold" accessibilityRole="header">
              Find your service area
            </Text>
            <Text size="sm">
              Search by feeder or substation. Your selection stays in place when you clear the search.
            </Text>
            <InputGroup>
              <InputGroup.Prefix isDecorative>
                <Search size={18} color={muted} />
              </InputGroup.Prefix>
              <InputGroup.Input
                accessibilityLabel="Search feeders or substations"
                placeholder="Search feeders or substations"
                value={areaQuery}
                onChangeText={setAreaQuery}
                autoCorrect={false}
                className="min-h-12 rounded-xl bg-card text-sm"
                style={{ minHeight: 48, fontSize: 14, lineHeight: 20 }}
              />
              {areaQuery ? (
                <InputGroup.Suffix>
                  <Button
                    variant="ghost"
                    size="icon"
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Clear area search"
                    onPress={() => setAreaQuery("")}
                  >
                    <X size={18} color={muted} />
                  </Button>
                </InputGroup.Suffix>
              ) : null}
            </InputGroup>
            <Text muted size="sm" accessibilityLiveRegion="polite">
              {matchingFeeders.length
                ? `${matchingFeeders.length} ${areaTerm ? "matching" : "available"} feeders`
                : "No matching feeders"} · {areaDraft.length} selected overall
            </Text>
            {!matchingFeeders.length ? (
              <View className="rounded-xl bg-card p-4">
                <Text muted size="sm">
                  Try a feeder or substation name. Your existing selections are kept.
                </Text>
              </View>
            ) : null}
            {station ? (
              matchingFeeders.map((f) => (
                <View key={f.id} className="rounded-xl bg-card p-3">
                <Checkbox
                  checked={areaDraft.includes(f.id)}
                  label={f.name}
                  onCheckedChange={(v) =>
                    changeIds(v ? [...areaDraft, f.id] : areaDraft.filter((id) => id !== f.id))
                  }
                />
                </View>
              ))
            ) : (
              <>
                {matchingStations.map((s) => {
                  const n = s.feeders.filter((f) => areaDraft.includes(f.id)).length;
                  return (
                    <View key={s.id} className="gap-1 rounded-xl bg-card p-3">
                      <Checkbox
                        checked={n === s.feeders.length && n > 0}
                        indeterminate={n > 0 && n < s.feeders.length}
                        disabled={!s.feeders.length}
                        label={s.name}
                        description={n + " of " + s.feeders.length + " feeders selected"}
                        onCheckedChange={(v) =>
                          changeIds(
                            v
                              ? [...areaDraft, ...s.feeders.map((f) => f.id)]
                              : areaDraft.filter((id) => !s.feeders.some((f) => f.id === id)),
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!s.feeders.length}
                        onPress={() => chooseStation(s.id)}
                      >
                        Choose feeders
                      </Button>
                    </View>
                  );
                })}
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    disabled={!matchingFeeders.length}
                    onPress={() => changeIds([...areaDraft, ...matchingFeeders.map((f) => f.id)])}
                  >
                    {areaTerm ? "Select matches" : "Select all"}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    disabled={!matchingFeeders.length}
                    onPress={() => changeIds(areaDraft.filter((id) => !matchingFeeders.some((f) => f.id === id)))}
                  >
                    {areaTerm ? "Clear matches" : "Clear all"}
                  </Button>
                </View>
              </>
            )}
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button
              onPress={() => {
                if (!draft) return;
                setDraft({ ...draft, ...compactAreas(draft.substations, areaDraft) });
                setError("");
                setAreaQuery("");
                setSheet(false);
              }}
            >
              Use selected areas
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Leave unsaved preferences?</Dialog.Title>
          <Dialog.Description>
            These changes are waiting to save. Leaving this screen discards them.
          </Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Stay here
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onPress={() => {
                allowLeave();
                leave();
              }}
            >
              Discard changes
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
