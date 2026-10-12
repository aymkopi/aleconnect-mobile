import { View } from "react-native";
import { useUniwind } from "uniwind";
import { consumerTicketStatusColors } from "./status";
import { Text } from "@/components/panelui/text";
import {
  consumerMessageTimelineIndex,
  consumerTicketStatusLabel,
  formatReportDate,
  type ReportDetail,
} from "./data";
import {
  reportStatusDescription,
  reportTimelineRows,
} from "./detail-presentation";

export function ReportTimeline({ report }: { report: ReportDetail }) {
  const { theme } = useUniwind();
  const dark = theme === "dark" || theme.endsWith("-dark");
  const rows = reportTimelineRows(report);
  const messageIndex = consumerMessageTimelineIndex(
    rows.map((row) => ({
      toStatus: row.status,
      changedAt: row.changedAt ?? "",
    })),
    report.consumerMessage,
  );
  return (
    <View className="rounded-xl bg-card p-3">
      {rows.map((row, index) => (
        <View key={`${row.id}:${index}`} className="flex-row gap-3">
          <View className="items-center w-4">
            <View
              className="h-2.5 w-2.5 rounded-full mt-1.5"
              style={{ backgroundColor: consumerTicketStatusColors(row.status, dark).foreground }}
            />
            {index < rows.length - 1 ? (
              <View
                className="w-px flex-1 bg-border mt-1 mb-1"
                style={{ minHeight: 24 }}
              />
            ) : null}
          </View>
          <View
            className="flex-1 gap-0.5"
            style={{ paddingBottom: index < rows.length - 1 ? 16 : 0 }}
          >
            <Text size="sm" weight={row.current ? "semibold" : "normal"}>
              {consumerTicketStatusLabel(row.status)}
            </Text>
            {row.changedAt ? (
              <Text size="xs" muted>
                {formatReportDate(row.changedAt)}
              </Text>
            ) : null}
            {row.note ? (
              <Text size="xs" muted>
                {row.note}
              </Text>
            ) : row.current && row.status ? (
              <Text size="xs" muted>
                {reportStatusDescription[row.status]}
              </Text>
            ) : null}
            {!row.changedAt && row.current ? (
              <Text size="xs" muted>
                Status change time is not available.
              </Text>
            ) : null}
            {index === messageIndex && report.consumerMessage ? (
              <View className="rounded-lg p-3 gap-1 mt-2" style={{ backgroundColor: consumerTicketStatusColors("under_review", dark).background }}>
                <Text size="xs" weight="semibold">
                  Part of an active incident
                </Text>
                <Text size="sm">{report.consumerMessage}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
      {!report.history.length ? (
        <Text size="xs" muted className="mt-3">
          Earlier status history is not available.
        </Text>
      ) : null}
    </View>
  );
}
