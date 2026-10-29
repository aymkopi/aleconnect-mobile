import type {
  ReportDetail,
  ReportHistoryItem,
  ConsumerTicketStatus,
} from "./data.ts";
import { formatReportDate } from "./data.ts";
import { parseApiInstant } from "../../utils/manila-time.ts";

export const reportStatusDescription: Record<ConsumerTicketStatus, string> = {
  under_review: "ALECO is checking the issue and service details you submitted.",
  verified: "ALECO has validated the concern for action.",
  rejected: "ALECO could not accept the report. Check its published reason.",
  dispatched: "A field crew has been assigned to your concern.",
  in_progress: "Work is underway to address your concern.",
  resolved: "ALECO has marked the concern as addressed.",
  closed: "This report is closed.",
};

export function reportDetailScope(input: {
  principalId: string | null;
  sessionId: string | null;
  identityId: string | null;
  reportId: string;
  serviceAccountId?: string;
  accessRevision: number;
  authorizedServiceAccountIds: readonly string[];
}) {
  if (
    !input.principalId ||
    !input.sessionId ||
    !input.identityId ||
    !input.reportId ||
    (input.serviceAccountId &&
      !input.authorizedServiceAccountIds.includes(input.serviceAccountId))
  )
    return null;
  return JSON.stringify([
    input.principalId,
    input.sessionId,
    input.identityId,
    input.accessRevision,
    input.serviceAccountId ?? "all",
    input.reportId,
  ]);
}

export function reportAccessUnavailable(error: unknown) {
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : null;
  return status === 401 || status === 403 || status === 404 || status === 410;
}

export function publishedRestorationEstimate(update: {
  estimateStartAt: string | null;
  estimateEndAt: string | null;
  estimateUnavailableReason: string | null;
}) {
  if (
    parseApiInstant(update.estimateStartAt ?? "") &&
    parseApiInstant(update.estimateEndAt ?? "")
  ) {
    return `${formatReportDate(update.estimateStartAt!)} to ${formatReportDate(update.estimateEndAt!)}`;
  }
  return typeof update.estimateUnavailableReason === "string" &&
    update.estimateUnavailableReason.trim()
    ? update.estimateUnavailableReason
    : "Restoration time has not been confirmed.";
}

export type ReportTimelineRow = {
  followUpCycle?:number;
  followUpStart?:boolean;
  id: string;
  status: ConsumerTicketStatus | null;
  changedAt: string | null;
  note: string | null;
  current: boolean;
};

export function reportTimelineRows(
  report: Pick<ReportDetail, "status" | "history">,
): ReportTimelineRow[] {
  const rows:ReportTimelineRow[] = report.history.map((item) => ({
    id: item.id,
    followUpCycle:item.followUpCycle,
    followUpStart:item.followUpStart,
    status: item.toStatus,
    changedAt: parseApiInstant(item.changedAt) ? item.changedAt : null,
    note: item.note,
    current: false,
  }));
  const latest = rows[rows.length - 1];
  if (latest && latest.status === report.status) latest.current = true;
  else
    rows.push({
      id: "current-status",
      status: report.status,
      // A current status without history does not supply the time it was reached.
      changedAt: null,
      note: report.status
        ? reportStatusDescription[report.status]
        : "Refresh to retrieve the latest status update.",
      current: true,
    });
  return rows;
}

export function reportRejectionReason(report: {
  history: readonly ReportHistoryItem[];
}) {
  return (
    [...report.history]
      .reverse()
      .find((item) => item.toStatus === "rejected" && item.note?.trim())
      ?.note ?? null
  );
}
