import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Button } from "@/components/panelui/button";
import { Progress } from "@/components/panelui/progress";
import { Text } from "@/components/panelui/text";
import { offlineMaps, startOfflineMap } from "@/services/offline-map-native";
import type { OfflineMapState } from "@/services/offline-maps";

export function OfflineMapSetup({ onReady }: { onReady?: (ready: boolean) => void }) {
  const [status, setStatus] = useState<OfflineMapState>(() => offlineMaps().snapshot());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const manager = offlineMaps();
    const unsubscribe = manager.subscribe(setStatus);
    let active = true;
    void manager.restore().then(async (restored) => {
      if (!active || restored.state === "ready" || restored.state === "failed") return;
      const network = await NetInfo.fetch();
      if (active && network.type === "wifi" && network.isConnected !== false && network.isInternetReachable !== false)
        await startOfflineMap();
    }).catch(() => undefined);
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => { onReady?.(Platform.OS === "web" || status.state === "ready"); }, [onReady, status.state]);
  if (Platform.OS === "web") return null;
  async function start(mobileData = false) {
    setBusy(true);
    try { await startOfflineMap(mobileData); } catch { /* The manager keeps the cause and original pack. */ }
    finally { setBusy(false); }
  }
  async function requestStart() {
    const network = await NetInfo.fetch().catch(() => null);
    if (network?.type === "cellular") {
      Alert.alert("Download Albay map?", "This download uses mobile data. You can connect to Wi-Fi instead.", [
        { text: "Use Wi-Fi", style: "cancel" }, { text: "Use mobile data", onPress: () => void start(true) },
      ]);
    } else await start();
  }
  const downloading = status.state === "downloading";
  return <View className="gap-2 rounded-xl bg-card p-4">
    <View className="flex-row items-center justify-between gap-3">
      <Text weight="semibold">Albay map</Text>
      <Text size="sm" muted accessibilityLiveRegion="polite">{status.state === "ready" ? "Ready offline" : downloading ? `${Math.floor(status.percentage)}%` : status.state === "paused" ? "Paused" : "Setup required"}</Text>
    </View>
    {downloading ? <Progress value={status.percentage} accessibilityLabel="Albay map download" /> : null}
    {status.error ? <Text size="sm" muted accessibilityLiveRegion="polite">{status.error}</Text> : null}
    {status.state !== "ready" ? <Button variant="ghost" loading={busy} fullWidth
      onPress={() => downloading ? void offlineMaps().pause().catch(() => undefined) : void requestStart().catch(() => undefined)}>
      {downloading ? "Pause" : status.state === "failed" ? "Retry" : status.packId ? "Resume" : "Download"}
    </Button> : null}
  </View>;
}
