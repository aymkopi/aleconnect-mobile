import { ActivityCard } from "@/components/activity-card";
import { Badge } from "@/components/panelui/badge";
import { Text } from "@/components/panelui/text";
import { SoftRadial } from "@/components/soft-radial";
import { useAppColors } from "@/hooks/use-app-colors";
import type { MobilePublicUpdate } from "@/services/public-updates";
import { formatManilaAdvisoryInterruptionRange, formatManilaDateTime } from "@/utils/manila-time";
import { ChevronRight, Zap } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { advisoryCardTitle, advisorySchedule, updateTopicLabel } from "./presentation";
export function PublisherCard({ item, onPress, featured = false, height }: {
  item: MobilePublicUpdate; onPress: () => void; featured?: boolean; height?: number;
}) {
  const [primary] = useAppColors(["primary"]);
  if (item.kind === "advisory") {
    const schedule = advisorySchedule(item);
    const metadata = schedule?.label === "Restored at"
      ? "Restored at " + formatManilaDateTime(schedule.start!)
      : schedule
        ? formatManilaAdvisoryInterruptionRange(schedule.start, schedule.end) ?? "Schedule not announced"
        : "Published: " + formatManilaDateTime(item.publishedAt);
    return <ActivityCard reference={item.controlNumber ?? "ALECO advisory"}
      title={advisoryCardTitle(item)} metadata={metadata} height={height} onPress={onPress}
      badge={["high", "critical"].includes(item.severity) ? <Badge size="xs" variant="destructive">Important</Badge> : undefined} />;
  }
  const title = item.message.split(/[.!?\n]/)[0] || "ALECO update";
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={height ? { height } : undefined} className={"rounded-xl bg-card overflow-hidden " + (featured ? "p-4 gap-2" : "p-3 gap-1")}>
    {featured ? <SoftRadial /> : null}
    <View className="flex-row items-center justify-between gap-2">
      {featured ? <View className="flex-row gap-2 items-center">
        <Zap size={18} color={primary} /><Text className="text-primary" weight="semibold" size="sm">{updateTopicLabel(item.topic)}</Text>
      </View> : <Text muted size="xs" numberOfLines={1} className="flex-1">{item.pageName ?? "ALECO"}</Text>}
      {!featured && item.topic ? <Badge size="xs" variant="info">{updateTopicLabel(item.topic)}</Badge> : null}
    </View>
    <Text numberOfLines={featured ? 3 : height ? 1 : 2} weight="bold" style={{ fontSize: featured ? 18 : 15, lineHeight: featured ? 25 : 20 }}>{title}</Text>
    <Text muted size="sm" numberOfLines={height ? 1 : 2}>{item.message}</Text>
    <View className="flex-row justify-end"><ChevronRight size={18} color={primary} /></View>
  </Pressable>;
}
