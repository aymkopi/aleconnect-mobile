import { View } from "react-native";
import { Bell } from "lucide-react-native";
import { useGuestAccess } from "@/context/guest-access-context";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { useAppColors } from "@/hooks/use-app-colors";
import type { ReactNode } from "react";
export function MainPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { openFeature } = useGuestAccess(),
    [color] = useAppColors(["foreground"]);
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <View className="flex-1">
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: "PlusJakartaSans_700Bold",
            fontSize: 24,
            lineHeight: 32,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text muted size="sm">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ?? (
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-card"
          style={{ width: 48, height: 48 }}
          accessibilityLabel="Notifications"
          onPress={() => openFeature("/notifications")}
        >
          <Bell size={20} color={color} />
        </Button>
      )}
    </View>
  );
}
