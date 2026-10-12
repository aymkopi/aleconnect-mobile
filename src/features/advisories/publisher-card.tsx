import { Pressable, View } from "react-native";
import { ChevronRight, Zap, MapPin } from "lucide-react-native";
import { Text } from "@/components/panelui/text";
import { Badge } from "@/components/panelui/badge";
import { useAppColors } from "@/hooks/use-app-colors";
import { SoftRadial } from "@/components/soft-radial";
import {
  formatManilaDateTime,
  formatManilaAdvisoryInterruptionRange,
} from "@/utils/manila-time";
import { advisorySchedule, updateTopicLabel } from "./presentation";
import type { MobilePublicUpdate } from "@/services/public-updates";
export function PublisherCard({
  item,
  onPress,
  featured = false,
  height,
}: {
  item: MobilePublicUpdate;
  onPress: () => void;
  featured?: boolean;
  height?: number;
}) {
  const [primary] = useAppColors(["primary"]);
  const advisory = item.kind === "advisory";
  const schedule = advisory ? advisorySchedule(item) : null;
  const title = advisory
    ? item.title
    : item.message.split(/[.!?\n]/)[0] || "ALECO update";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={height ? { height } : undefined}
      className={
        "rounded-xl border border-border bg-card overflow-hidden " +
        (featured ? "p-4 gap-2" : "p-3 gap-1")
      }
    >
      {featured ? <SoftRadial /> : null}
      <View className="flex-row items-center justify-between gap-2">
        {featured ? (
          <View className="flex-row gap-2 items-center">
            <Zap size={18} color={primary} />
            <Text className="text-primary" weight="semibold" size="sm">
              {advisory ? item.type === "general" && item.topic ? updateTopicLabel(item.topic) : "Service advisory" : updateTopicLabel(item.topic)}
            </Text>
          </View>
        ) : (
          <Text muted size="xs" numberOfLines={1} className="flex-1">
            {advisory
              ? (item.controlNumber ?? "ALECO advisory")
              : [item.pageName ?? "ALECO", item.topic ? updateTopicLabel(item.topic) : null].filter(Boolean).join(" · ")}
          </Text>
        )}
        {advisory && ["high", "critical"].includes(item.severity) ? (
          <Badge
            size="xs"
            variant="destructive"
            className="rounded px-2 py-0.5"
            labelClassName="text-[10px] leading-[14px]"
          >
            Important
          </Badge>
        ) : null}
      </View>
      <Text
        numberOfLines={featured ? 3 : height ? 1 : 2}
        weight="bold"
        style={{ fontSize: featured ? 18 : 15, lineHeight: featured ? 25 : 20 }}
      >
        {title}
      </Text>
      {advisory ? (
        <Text size="xs" numberOfLines={1}>
          {schedule?.label === "Restored at"
            ? "Restored · " + formatManilaDateTime(schedule.start!)
            : schedule
              ? (formatManilaAdvisoryInterruptionRange(
                  schedule.start,
                  schedule.end,
                ) ?? "Schedule not announced")
              : formatManilaDateTime(item.publishedAt)}
        </Text>
      ) : (
        <Text muted size="sm" numberOfLines={height ? 1 : 2}>
          {item.message}
        </Text>
      )}
      <View className="flex-row items-center gap-1">
        {featured && advisory ? <MapPin size={14} color={primary} /> : null}
        <Text muted size="xs" className="flex-1" numberOfLines={1}>
          {advisory
            ? (item.audience ?? "Read full advisory")
            : featured
              ? "Latest news from ALECO"
              : "Read story · ALECO feed"}
        </Text>
        <ChevronRight size={18} color={primary} />
      </View>
    </Pressable>
  );
}
