import { DataNotice, DataState } from "@/components/data-state";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { Switch } from "@/components/panelui/switch";
import { Text } from "@/components/panelui/text";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAppColors } from "@/hooks/use-app-colors";
import { useScopedRead } from "@/hooks/use-scoped-read";
import {
  fetchNotificationSettings,
  registerDevicePushToken,
  saveNotificationSettings,
  type NotificationSettingsResult,
} from "@/services/notification-settings";
import {
  registerForPushNotificationsAsync,
  requestPushNotificationPermissionAsync,
} from "@/services/push-notifications";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Bell, Zap } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { profileFixtureSettings } from "./profile-fixtures";
import {
  ProfileGate,
  ProfileNotice,
  useProfileBackGuard,
  useProfileTask,
  type ProfileIdentity,
} from "./profile-ui";
function payload(value: NotificationSettingsResult) {
  return {
    ...value.preferences,
  };
}
export default function AlertsScreen() {
  return (
    <ProfileGate>{(identity) => <Alerts identity={identity} />}</ProfileGate>
  );
}
function Alerts({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(),
    current = useProfileTask(identity),
    [primary, muted] = useAppColors(["primary", "muted-foreground"]);
  const read = useScopedRead(identity.key, () =>
    identity.fixture
      ? Promise.resolve(profileFixtureSettings)
      : fetchNotificationSettings(identity.key),
  );
  const [draft, setDraft] = useState<NotificationSettingsResult | null>(null),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [retry, setRetry] = useState(0),
    [online, setOnline] = useState(identity.fixture),
    [permission, setPermission] = useState(
      identity.fixture ? "Allowed" : "Checking",
    ),
    [deviceBusy, setDeviceBusy] = useState(false),
    [deviceError, setDeviceError] = useState(""),
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
          setPermission(
            p.granted ? "Allowed" : p.canAskAgain ? "Not allowed" : "Blocked",
          );
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
          : saveNotificationSettings(identity.key, value)
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
    identity.key,
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
  function update(
    field: "receivePushNotifications" | "receiveAdvisories",
    value: boolean,
  ) {
    if (saving) return;
    setError("");
    setDraft((d) =>
      d ? { ...d, preferences: { ...d.preferences, [field]: value } } : d,
    );
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
      if (PANELUI_PREVIEW)
        throw new Error(
          "Live device registration is disabled in this preview.",
        );
      const p = await requestPushNotificationPermissionAsync();
      if (!current()) return;
      setPermission(
        p.granted ? "Allowed" : p.canAskAgain ? "Not allowed" : "Blocked",
      );
      if (!p.granted)
        throw new Error(
          "Enable notifications in device settings to receive alerts.",
        );
      const token = await registerForPushNotificationsAsync();
      if (!current()) return;
      if (!token)
        throw new Error(
          "Device alert setup did not complete. Your saved preferences are kept.",
        );
      const result = await registerDevicePushToken(token);
      if (current() && !result?.ok)
        throw new Error("This device could not be registered. Retry setup.");
      if (current()) setDeviceRegistered(true);
    } catch (e) {
      if (current())
        setDeviceError(
          e instanceof Error ? e.message : "Device alert setup failed.",
        );
    } finally {
      if (current()) setDeviceBusy(false);
    }
  }
  return (
    <>
      <ReportPage title="Alerts & notifications" onBack={back}>
        {!draft ? (
          loading ? (
            <DataState
              loading
              loadingLayout="settings"
              title="Loading your notification settings"
            />
          ) : (
            <DataState
              title="Settings couldn’t load"
              description="Connect to load your preferences for the first time. Your saved choices have not been changed."
              actionLabel="Try again"
              onAction={() => void refresh(true)}
            />
          )
        ) : (
          <>
            {!online || loaded?.isStale ? (
              <ProfileNotice
                title="Saved view, waiting for connection"
                description={
                  dirty
                    ? "Your changes are kept on this screen. They will save after a fresh server check."
                    : "Last saved settings are shown. Connect and refresh to make changes."
                }
              />
            ) : null}
            <Text size="sm" weight="semibold" accessibilityRole="header">
              Receive notifications
            </Text>
            <View className="gap-3 rounded-xl bg-card p-3">
              <View className="flex-row items-center gap-2">
                <Bell size={18} color={muted} />
                <View className="flex-1 gap-1">
                  <Text size="sm" weight="semibold">
                    Push notifications
                  </Text>
                  <Text size="xs" muted>
                    Alerts on this device.
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
                    Outages and restoration updates.
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
                variant="ghost"
                loading={deviceBusy}
                onPress={() =>
                  permission === "Blocked"
                    ? void Linking.openSettings().catch(() =>
                        setDeviceError(
                          "Open device settings to allow notifications.",
                        ),
                      )
                    : void setup()
                }
              >
                {permission === "Blocked"
                  ? "Open device settings"
                  : "Set up device alerts"}
              </Button>
            </View>
            {deviceError ? (
              <ProfileNotice
                title="Device setup incomplete"
                description={deviceError}
                danger
              />
            ) : null}
            {deviceRegistered &&
            permission === "Allowed" &&
            !deviceBusy &&
            !deviceError ? (
              <Text
                size="xs"
                className="text-primary"
                accessibilityLiveRegion="polite"
              >
                {identity.fixture
                  ? "Visual fixture; device setup simulated"
                  : "Device alerts are ready"}
              </Text>
            ) : null}
            <Text size="xs" muted accessibilityLiveRegion="polite">
              {saving || loading
                ? "Saving preferences…"
                : error || read.error
                  ? "Preferences not synced"
                  : dirty || !online || loaded?.isStale
                    ? "Preferences waiting to sync"
                    : identity.fixture ? "Local preview" : "Preferences synced"}
            </Text>
            <Text size="sm" weight="semibold" accessibilityRole="header">
              Automatic account coverage
            </Text>
            <Text size="sm" muted>
              Advisory alerts follow the selected location of every linked ALECO account. Coverage updates automatically when an account location changes.
            </Text>
            {identity.account.accounts.map((account) => {
              const coverage = draft.accountCoverage?.find((item) => item.serviceAccountId === account.id);
              return (
                <View key={account.id} className="gap-2 rounded-xl bg-card p-3">
                  <Text size="sm" weight="semibold">{account.accountNumber || account.registeredName || "ALECO account"}</Text>
                  <Text size="sm" muted>{account.address || "No account location selected"}</Text>
                  <Text size="sm">
                    {coverage?.feeders.length
                      ? coverage.feeders.map((feeder) => feeder.name).join(", ")
                      : !coverage
                        ? "Refresh settings to load this account’s coverage."
                        : !coverage.barangayPsgc
                          ? "Select this account’s location in Account details to set up feeder coverage."
                          : "Feeder coverage is not available for this account location yet."}
                  </Text>
                </View>
              );
            })}
            <Text size="xs" muted>
              Accounts without feeder coverage receive only advisories addressed to everyone. You can browse all advisories at any time.
            </Text>
            <Button variant="outline" onPress={() => router.push("/advisories")}>
              Browse all advisories
            </Button>
            <Text size="xs" muted>
              Report updates are sent to your ALECO account.
            </Text>

            {error ? (
              <>
                <ProfileNotice
                  title="Preferences were not saved"
                  description={error}
                  danger
                />
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
              <DataNotice
                title="Could not refresh preferences"
                description="Your saved choices and unsaved changes remain in place. Reconnect and refresh before making further changes."
                actionLabel="Refresh settings"
                busy={loading || saving}
                onAction={() => void refresh(true)}
              />
            ) : null}
            {loaded?.isStale && !read.error ? (
              <Button variant="outline" onPress={() => void refresh(true)}>
                Refresh saved settings
              </Button>
            ) : null}
          </>
        )}
      </ReportPage>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Leave unsaved preferences?</Dialog.Title>
          <Dialog.Description>
            These changes are waiting to save. Leaving this screen discards
            them.
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
