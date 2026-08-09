import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import {
    formatReportDate,
    formatStatus,
    type Report,
} from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import { FileText } from "lucide-react-native";
import { View } from "react-native";

export function ReportStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
  const tone =
    normalized === "resolved" ||
    normalized === "completed" ||
    normalized === "closed"
      ? "bg-success text-success-foreground"
      : normalized === "cancelled" ||
          normalized === "canceled" ||
          normalized === "rejected"
        ? "bg-danger text-danger-foreground"
        : normalized === "assigned" ||
            normalized === "in_progress" ||
            normalized === "on_hold"
          ? "bg-warning text-warning-foreground"
          : "bg-secondary text-secondary-foreground";

  return (
    <View className={`rounded-full px-3 py-1 ${tone.split(" ")[0]}`}>
      <Text className={`text-xs font-bold ${tone.split(" ")[1]}`}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

export function ReportListGroup({
  reports,
  getColor,
  onPress,
}: {
  reports: Report[];
  getColor?: (report: Report) => string | undefined;
  onPress: (report: Report) => void;
}) {
  const [accentColor] = useAppColors(["accent"]);

  return (
    <ListSection>
      {reports.map((report, index) => (
        <ListSectionItem
          key={report.id}
          accessibilityLabel={`Open report ${report.ticketNumber}`}
          description={
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
              {[
                report.typeTitle !== report.title ? report.typeTitle : null,
                formatReportDate(report.createdAt),
              ]
                .filter(Boolean)
                .join(" - ")}
            </Text>
          }
          leading={
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: getColor?.(report) ?? accentColor }}
            >
              <FileText size={18} color="white" />
            </View>
          }
          onPress={() => onPress(report)}
          showDivider={index < reports.length - 1}
          title={
            <View className="min-w-0 gap-0.5">
              <Text className="text-xs font-bold text-muted-foreground">
                {report.ticketNumber}
              </Text>
              <Text className="font-semibold text-foreground" numberOfLines={2}>
                {report.title}
              </Text>
            </View>
          }
          trailing={<ReportStatusBadge status={report.status} />}
        />
      ))}
    </ListSection>
  );
}
