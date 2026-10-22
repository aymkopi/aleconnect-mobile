import { ActivityCard } from "@/components/activity-card";
import { Badge } from "@/components/panelui/badge";
import type { MobilePublicUpdate } from "@/services/public-updates";
import { formatManilaAdvisoryInterruptionRange, formatManilaDateTime, parseApiInstant } from "@/utils/manila-time";
import { advisoryCardTitle, advisorySchedule, updateTopicLabel } from "./presentation";
export function PublisherCard({ item, onPress, height }: {
  item: MobilePublicUpdate; onPress: () => void; height?: number;
}) {
  if (item.kind === "advisory") {
    const schedule = advisorySchedule(item);
    const metadata = schedule?.label === "Restored at"
      ? "Restored at " + formatManilaDateTime(schedule.start!)
      : schedule
        ? formatManilaAdvisoryInterruptionRange(schedule.start, schedule.end) ?? "Schedule not announced"
        : "Published: " + formatManilaDateTime(item.publishedAt);
    return <ActivityCard reference={item.controlNumber ?? "ALECO advisory"}
      title={advisoryCardTitle(item)} metadata={metadata} height={height} onPress={onPress}
      footer={item.audience?.trim() || "Read full advisory"}
      badge={["high", "critical"].includes(item.severity) ? <Badge size="xs" variant="destructive">Important</Badge> : undefined} />;
  }
  const title = item.message.split(/[.!?\n]/)[0] || "ALECO update";
  return <ActivityCard reference={item.pageName ?? "ALECO"} title={title}
    metadata={parseApiInstant(item.publishedAt) ? "Published: " + formatManilaDateTime(item.publishedAt) : "Facebook post"} height={height} onPress={onPress}
    badge={item.topic ? <Badge size="xs" variant="info">{updateTopicLabel(item.topic)}</Badge> : undefined} />;
}
