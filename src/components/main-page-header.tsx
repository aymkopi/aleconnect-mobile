import { View } from "react-native";
import { NotificationButton } from "@/components/notification-button";
import { Text } from "@/components/panelui/text";
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
      {action ?? <NotificationButton />}
    </View>
  );
}
