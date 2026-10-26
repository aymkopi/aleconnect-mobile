import type { ReportQueueItem } from "../../services/report-queue.ts";
import { reportFailureMessage, reportReceiptIsUncertain } from '../../utils/report-transport.ts';

export function presentQueuedReport(
  item: ReportQueueItem,
  syncing: boolean,
  accessAllowed = true,
) {
  const confirmed = item.status === "submitted";
  const sending = !confirmed && (item.status === "submitting" || syncing);
  const unconfirmed = !confirmed && reportReceiptIsUncertain(item);
  return {
    label: confirmed
      ? "Received by ALECO"
      : sending
        ? "Sending"
        : unconfirmed
          ? "Not confirmed"
          : item.status === "failed"
            ? "Not sent"
            : item.lastError ? "Not sent" : "Waiting to send",
    description: confirmed
      ? `ALECO reference: ${item.ticketNumber || "Reference unavailable"}.`
      : sending
        ? "Sending to ALECO…"
        : item.nonRetryable || !accessAllowed
          ? "Account access changed. Refresh your accounts."
          : item.lastError
            ? reportFailureMessage({ status: item.lastErrorStatus, code: item.lastErrorCode, phase: item.lastErrorPhase, message: item.lastError })
            : unconfirmed ? "Couldn’t confirm submission. Try again." : "We’ll send it when you’re connected.",
    canRetry: !sending && !confirmed && !item.nonRetryable && accessAllowed,
    canDiscard: !sending && !confirmed && !unconfirmed,
    confirmed,
    sending,
    unconfirmed,
    variant: confirmed
      ? ("success" as const)
      : item.status === "failed"
        ? ("destructive" as const)
        : unconfirmed
          ? ("warning" as const)
          : ("secondary" as const),
  };
}
export function queueDiagnosticText(item: ReportQueueItem) {
  return [
    "ALEConnect saved report support",
    `Support reference: ${item.diagnosticId || "Not available"}`,
    `State: ${item.status}`,
    `Phase: ${item.lastErrorPhase || "Not available"}`,
    `Attempts: ${item.attempts}`,
    `Saved: ${item.createdAt}`,
    `Last attempt: ${item.updatedAt}`,
    ...(item.lastError ? [`Cause: ${reportFailureMessage({status:item.lastErrorStatus,code:item.lastErrorCode,phase:item.lastErrorPhase,message:item.lastError})}`] : []),
  ].join("\n");
}
export function simulateQueueRetry(
  item: ReportQueueItem,
  outcome: "confirmed" | "failed",
) {
  return {
    ...item,
    status:
      outcome === "confirmed" ? ("submitted" as const) : ("failed" as const),
    attempts: item.attempts + 1,
    ticketId: outcome === "confirmed" ? "fixture-browse-0" : null,
    ticketNumber: outcome === "confirmed" ? "TK-2026-1042" : null,
    lastError:
      outcome === "failed"
        ? "Fixture: one prepared photo could not be read. Your saved details are retained."
        : null,
    lastErrorPhase: outcome === "failed" ? ("evidence upload" as const) : null,
  };
}
export const fixtureSavedReport: ReportQueueItem = {
  id: "fixture-saved",
  idempotencyKey: "fixture-submission-key",
  userId: "fixture-owner",
  identityUserId: "fixture-owner",
  serviceAccountId: "fixture-home",
  accessRevision: 1,
  title: "Primary line",
  createdAt: "2026-10-09T01:12:00Z",
  updatedAt: "2026-10-09T01:12:00Z",
  status: "queued",
  attempts: 0,
  lastError: null,
  lastErrorPhase: null,
  diagnosticId: "fixture-support-reference",
  ticketId: null,
  ticketNumber: null,
  payload: {
    typeId: "primary",
    accountNumber: "10004821",
    barangayPsgc: "fixture-bigaa",
    purok: "14 Rizal St, Bigaa, Legazpi",
    landmark: "Nearby homes are also affected.",
    actionDesired: "No power since 6:00 AM.",
    latitude: null,
    longitude: null,
  },
  evidence: Array.from({ length: 3 }, (_, i) => ({
    id: "fixture-photo-" + i,
    uri: "",
    size: 100_000,
  })),
};
