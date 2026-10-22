import { ActivityCard } from "@/components/activity-card";
import { formatManilaDateTime } from "@/utils/manila-time";
import { consumerTicketStatusLabel, reportCardDate, type Report } from "./data";
import { ReportStatusBadge } from "./report-status-badge";
export function ReportCard({ report, onPress }: { report: Report; onPress: () => void }) {
  const unread = !!report.unreadNotificationIds?.length;
  const date = reportCardDate(report);
  return <ActivityCard reference={report.ticketNumber || "Reference pending"}
    title={report.typeTitle || report.title} metadata={date.label + ": " + formatManilaDateTime(date.date)}
    badge={<ReportStatusBadge status={report.status} />} unread={unread} onPress={onPress}
    accessibilityLabel={[report.ticketNumber, report.typeTitle, consumerTicketStatusLabel(report.status), date.label, formatManilaDateTime(date.date), unread ? "unread report update" : ""].filter(Boolean).join(", ")} />;
}
