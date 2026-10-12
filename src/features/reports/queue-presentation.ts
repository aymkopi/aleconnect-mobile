import type { ReportQueueItem } from "../../services/report-queue.ts";

export function presentQueuedReport(
  item: ReportQueueItem,
  syncing: boolean,
  accessAllowed = true,
) {
  const confirmed = item.status === "submitted";
  const sending = !confirmed && (item.status === "submitting" || syncing);
  // Only the latest phase is retained, so repeated attempts cannot rule out an earlier committed ticket.
  const unconfirmed =
    !confirmed &&
    (item.lastErrorPhase === "final submit" ||
      item.attempts > 1 ||
      (item.attempts > 0 && !item.lastErrorPhase));
  return {
    label: confirmed
      ? "Received by ALECO"
      : sending
        ? "Sending report"
        : unconfirmed
          ? "Receipt not confirmed"
          : item.status === "failed"
            ? "Needs attention"
            : "Waiting for a connection",
    description: confirmed
      ? `ALECO reference: ${item.ticketNumber || "Reference unavailable"}.`
      : sending
        ? "Your saved report is being sent. Keep the app open; its details and photos stay protected."
        : unconfirmed
          ? "ALECO may have received this report. Try again with the same account and submission key to confirm; keep this saved copy."
          : item.nonRetryable || !accessAllowed
            ? "This saved report no longer matches current account access. Refresh your linked accounts before trying again."
            : item.status === "failed"
              ? "Your details and photos remain saved. Review the error before trying again."
              : "Saved on this device. No ALECO reference has been assigned. It will use the same account and submission key when sent.",
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
