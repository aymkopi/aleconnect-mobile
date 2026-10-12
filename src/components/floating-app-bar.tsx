import {
  FileText,
  Home,
  Megaphone,
  Phone,
  UserRound,
} from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
const APP_BAR_HEIGHT = 64;
export function appScrollableBottomPadding(bottom: number) {
  return APP_BAR_HEIGHT + Math.max(bottom, 8) + 24;
}
const items = [
  { title: "Home", icon: Home },
  { title: "Reports", icon: FileText },
  { title: "Advisories", icon: Megaphone },
  { title: "Hotlines", icon: Phone },
  { title: "Account", icon: UserRound },
];
export function FloatingAppBar({
  currentIndex,
  onSelect,
}: {
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets(),
    [surface, primary, muted, border] = useAppColors([
      "card",
      "primary",
      "muted-foreground",
      "border",
    ]);
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 8),
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          height: APP_BAR_HEIGHT,
          backgroundColor: surface,
          borderColor: border,
          borderWidth: 0.5,
          borderRadius: 999,
          padding: 6,
          flexDirection: "row",
        }}
      >
        {items.map(({ title, icon: Icon }, i) => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityLabel={title}
            accessibilityState={{ selected: i === currentIndex }}
            onPress={() => onSelect(i)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              borderRadius: 999,
              backgroundColor:
                i === currentIndex ? primary + "12" : "transparent",
            }}
          >
            <Icon
              size={20}
              strokeWidth={1.8}
              color={i === currentIndex ? primary : muted}
            />
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: width < 380 && fontScale > 1.15 ? 9 : 10,
                lineHeight: 14,
                color: i === currentIndex ? primary : muted,
              }}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
