import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { formatStatus, type Report } from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import { formatManilaReportListDateTime } from "@/utils/manila-time";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

export function ReportStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");

  const tone =
    normalized === "verified"
      ? "bg-accent/10 text-accent"
      : normalized === "resolved" ||
          normalized === "completed" ||
          normalized === "closed"
        ? "bg-success text-success-foreground"
        : normalized === "cancelled" ||
            normalized === "canceled" ||
            normalized === "rejected"
          ? "bg-danger text-danger-foreground"
          : normalized === "assigned" ||
              normalized === "dispatched" ||
              normalized === "in_progress" ||
              normalized === "on_hold"
            ? "bg-warning text-warning-foreground"
            : "bg-secondary text-secondary-foreground";

  const [backgroundClass, textClass] = tone.split(" ");

  return (
    <View className={`shrink-0 rounded-md px-2 py-1 ${backgroundClass}`}>
      <Text className={`text-[11px] font-semibold leading-4 ${textClass}`}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

export function ReportListGroup({
  reports,
  onPress,
  showAccountLabel = false,
}: {
  reports: Report[];
  onPress: (report: Report) => void;
  showAccountLabel?: boolean;
}) {
  const [mutedForegroundColor] = useAppColors(["muted-foreground"]);

  return (
    <View className="gap-2">
      {reports.map((report) => {
        const displayAddress =
          typeof report.displayAddress === "string" &&
          report.displayAddress.trim()
            ? report.displayAddress.trim()
            : null;

        return (
          <Pressable
            key={report.id}
            accessibilityLabel={`Open report ${report.ticketNumber}`}
            accessibilityRole="button"
            className="rounded-lg border border-border bg-card px-4 py-3 active:bg-secondary"
            onPress={() => onPress(report)}
          >
            <View className="gap-2">
              {/* Ticket + status */}
              <View className="flex-row items-center justify-between gap-3">
                <Text
                  className="min-w-0 flex-1 text-xs font-medium text-muted-foreground"
                  numberOfLines={1}
                >
                  {report.ticketNumber}
                </Text>

                <ReportStatusBadge status={report.status} />
              </View>

              {/* Report title */}
              <Text
                className="text-base font-semibold leading-5 text-foreground"
                numberOfLines={2}
              >
                {report.title}
              </Text>
              {showAccountLabel && report.serviceAccountId && (report.accountNumber || report.accountName) ? (
                <Text className="text-xs font-semibold text-accent" numberOfLines={1}>
                  {[report.accountNumber, report.accountName].filter(Boolean).join(" · ")}
                </Text>
              ) : null}

              {/* Metadata */}
              <View className="flex-row items-center gap-2">
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className="text-xs leading-4 text-foreground"
                    numberOfLines={1}
                  >
                    {formatManilaReportListDateTime(report.createdAt)}
                  </Text>

                  {displayAddress ? (
                    <Text
                      className="text-xs leading-4 text-muted-foreground"
                      numberOfLines={1}
                    >
                      {displayAddress}
                    </Text>
                  ) : null}
                </View>

                <ChevronRight
                  size={18}
                  color={mutedForegroundColor}
                  strokeWidth={2}
                />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
