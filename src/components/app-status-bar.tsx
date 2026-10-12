import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";
import { useAppColors } from "@/hooks/use-app-colors";

export function AppStatusBar({ photo = false }: { photo?: boolean }) {
  const { top } = useSafeAreaInsets();
  const { theme } = useUniwind();
  const [background] = useAppColors(["background"]);
  const dark = photo || theme === "dark" || theme.endsWith("-dark");
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      {/* Photos extend behind system icons; other pages mask scrolled content in the safe area. */}
      {!photo && (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: top, backgroundColor: background }}
        />
      )}
    </>
  );
}
