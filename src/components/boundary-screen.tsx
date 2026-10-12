import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { useAppColors } from "@/hooks/use-app-colors";
export default function BoundaryScreen() {
  const router = useRouter(),
    insets = useSafeAreaInsets(),
    [color] = useAppColors(["foreground"]);
  return (
    <View
      className="flex-1 bg-background px-4 gap-3"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <Button
        size="icon"
        variant="ghost"
        accessibilityLabel="Go back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/home")
        }
      >
        <ArrowLeft size={20} color={color} />
      </Button>
      <View className="flex-1 justify-center gap-3">
        <Text weight="bold" size="2xl">
          Coming next
        </Text>
        <Text muted>
          This preview includes Home, Reports, Advisories, Hotlines and Account.
          Your saved reports and account data are retained.
        </Text>
        <Button onPress={() => router.replace("/home")}>Back to Home</Button>
      </View>
    </View>
  );
}
