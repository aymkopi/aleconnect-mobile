import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import { formatManilaDateTime } from "@/utils/manila-time";
import { BellDot, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { consumerTicketStatusLabel, type Report } from "./data";
import { ReportStatusBadge } from "./report-status-badge";
export function ReportCard({
  report,
  onPress,
}: {
  report: Report;
  onPress: () => void;
}) {
  const [primary, accent] = useAppColors(["primary", "accent"]);
  const unread = !!report.unreadNotificationIds?.length;
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
      className="rounded-xl bg-card p-3 gap-1.5"
      style={unread ? { backgroundColor: accent } : undefined}
    >
      {unread ? (
        <View className="flex-row items-center gap-1.5 pb-1">
          <BellDot size={14} color={primary} />
          <Text size="xs" weight="medium" className="text-primary">
            New report update · Open to read
          </Text>
        </View>
      ) : null}
      <View className="flex-row items-center justify-between gap-2">
        <Text size="xs" muted className="flex-1">
          {report.ticketNumber || "Reference pending"}
        </Text>
        <ReportStatusBadge status={report.status} />
      </View>
      <Text
        weight="bold"
        style={{ fontSize: 16, lineHeight: 22 }}
        numberOfLines={2}
      >
        {report.typeTitle || report.title}
      </Text>
      <Text size="xs">{formatManilaDateTime(report.createdAt)}</Text>
      <View className="flex-row items-center gap-2">
        <Text muted size="xs" className="flex-1" numberOfLines={2}>
          {report.displayAddress ?? report.categoryTitle}
        </Text>
        <ChevronRight size={18} color={primary} />
      </View>
    </Pressable>
  );
}
