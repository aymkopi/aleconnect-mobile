import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import { formatManilaDateTime } from "@/utils/manila-time";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { consumerTicketStatusLabel, reportCardDate, type Report } from "./data";
import { ReportStatusBadge } from "./report-status-badge";
export function ReportCard({
  report,
  onPress,
}: {
  report: Report;
  onPress: () => void;
}) {
  const [primary] = useAppColors(["primary"]);
  const unread = !!report.unreadNotificationIds?.length;
  const date = reportCardDate(report);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        report.ticketNumber +
        ", " +
        report.typeTitle +
        ", " +
        consumerTicketStatusLabel(report.status) +
        (unread ? ", unread report update" : "")
      }
      onPress={onPress}
      className={unread ? "rounded-xl bg-notification-unread p-3 gap-1" : "rounded-xl bg-card p-3 gap-1"}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text size="xs" muted className="flex-1">
          {report.ticketNumber || "Reference pending"}
        </Text>
        <ReportStatusBadge status={report.status} />
        {unread && <View className="h-1.5 w-1.5 rounded-full bg-primary" accessibilityElementsHidden importantForAccessibility="no" />}
      </View>
      <Text
        weight="bold"
        style={{ fontSize: 16, lineHeight: 22 }}
        numberOfLines={2}
      >
        {report.typeTitle || report.title}
      </Text>
      <Text size="xs" muted>{date.label} {formatManilaDateTime(date.date)}</Text>
      <View className="flex-row items-center gap-2">
        <Text muted size="xs" className="flex-1" numberOfLines={2}>
          {report.displayAddress ?? report.categoryTitle}
        </Text>
        <ChevronRight size={18} color={primary} />
      </View>
    </Pressable>
  );
}
