import type { ErrorBoundaryProps } from "expo-router";
import { PanelUIProvider } from "@/components/panelui/panel-ui-provider";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CircleAlert, MapPinOff } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { DataState } from "@/components/data-state";
import { AppStatusBar } from "@/components/app-status-bar";
import { useAppColors } from "@/hooks/use-app-colors";

export default function RecoveryScreen({ retry }: { retry?: () => Promise<void> }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [foreground] = useAppColors(["foreground"]);
  const [busy, setBusy] = useState(false);
  const home = () => router.replace("/home");
  const recover = async () => {
    if (!retry || busy) return;
    setBusy(true);
    try { await retry(); } catch { /* Expo Router keeps the failed route in its boundary. */ }
    finally { setBusy(false); }
  };
  return <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <AppStatusBar />
    <View className="flex-row items-center px-4 gap-2" style={{ minHeight: 56 }}>
      <Button variant="ghost" size="icon" accessibilityLabel="Back to Home" onPress={home}>
        <ArrowLeft size={20} color={foreground} />
      </Button>
      <Text weight="semibold" className="flex-1 text-center" style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 18, lineHeight: 26 }}>
        {retry ? "Screen recovery" : "Page unavailable"}
      </Text>
      <View style={{ width: 44 }} />
    </View>
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
      <DataState icon={retry ? CircleAlert : MapPinOff}
        title={retry ? "This screen couldn’t open" : "This page isn’t available"}
        description={retry ? "Try opening this screen again. Saved reports remain on this device." : "The link may have changed. Return to Home to continue."}
        actionLabel={retry ? "Try again" : "Back to Home"}
        busy={busy} onAction={retry ? () => void recover() : home} />
    </ScrollView>
  </View>;
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <PanelUIProvider><RecoveryScreen retry={retry} /></PanelUIProvider>;
}
