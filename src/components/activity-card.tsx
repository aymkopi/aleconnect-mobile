import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";

export function ActivityCard({ reference, title, metadata, badge, unread = false, height, onPress, accessibilityLabel }: {
  reference: string;
  title: string;
  metadata: string;
  badge?: ReactNode;
  unread?: boolean;
  height?: number;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const [primary] = useAppColors(["primary"]);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? [reference, title, metadata].join(", ")}
    onPress={onPress} style={{ height }}
    className={unread ? "rounded-xl bg-notification-unread p-3 gap-1 justify-center" : "rounded-xl bg-card p-3 gap-1 justify-center"}>
    <View className="flex-row items-center gap-2">
      <Text size="xs" muted className="flex-1" numberOfLines={1}>{reference}</Text>
      {badge}
      {unread ? <View className="h-1.5 w-1.5 rounded-full bg-primary" accessibilityElementsHidden importantForAccessibility="no" /> : null}
    </View>
    <Text weight="bold" numberOfLines={2} style={{ fontSize: 16, lineHeight: 20, flexShrink: 1 }}>{title}</Text>
    <View className="flex-row items-center gap-2">
      <Text size="xs" muted className="flex-1" numberOfLines={height ? 1 : 2}>{metadata}</Text>
      <ChevronRight size={18} color={primary} />
    </View>
  </Pressable>;
}
