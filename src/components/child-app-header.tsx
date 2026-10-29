import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";

export function ChildAppHeader({
  title,
  backButton,
  action,
}: {
  title: string;
  backButton: ReactNode;
  action?: ReactNode;
}) {
  const [actionWidth, setActionWidth] = useState(44);
  const [background] = useAppColors(["background"]);
  return (
    <View style={{
      minHeight: 56, paddingHorizontal: 16, paddingVertical: 6,
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: background,
    }}>
      <View style={{ width: actionWidth, flexShrink: 0 }}>{backButton}</View>
      <Text accessibilityRole="header" accessibilityLabel={title}
        numberOfLines={1} ellipsizeMode="tail"
        style={{
          flex: 1, minWidth: 0, textAlign: "center",
          fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 18, lineHeight: 26,
        }}>
        {title}
      </Text>
      <View
        onLayout={event => setActionWidth(Math.max(44, event.nativeEvent.layout.width))}
        style={{ minWidth: 44, flexShrink: 0, alignItems: "flex-end" }}>
        {action}
      </View>
    </View>
  );
}
