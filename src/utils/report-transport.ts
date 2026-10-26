import { isRateLimit, RATE_LIMIT_MESSAGE } from './rate-limit.ts';

export type RequestPhase =
  | "request"
  | "metadata"
  | "evidence upload"
  | "final submit"
  | "refresh";

export function reportReceiptIsUncertain(item: { receiptUncertain?: boolean; attempts: number; lastErrorPhase: RequestPhase | null }) {
  return item.receiptUncertain ?? (item.lastErrorPhase === 'final submit' || item.attempts > 1 || (item.attempts > 0 && !item.lastErrorPhase));
}

export function reportFailureMessage(error: { status?: number | null; code?: string | null; message?: string | null; phase?: RequestPhase | null }) {
  if (isRateLimit(error.status ?? undefined, error.code ?? undefined)) return RATE_LIMIT_MESSAGE;
  if (error.status != null && error.status >= 500) return 'Server error. Try again later.';
  if (error.status === 401) return 'Sign in again to send your report.';
  if (error.status === 403 || /ACCOUNT_NOT_ACCESSIBLE|STALE_ACCESS_REVISION|QUEUE_ACCESS_STALE/.test(error.code ?? '')) return 'Account access changed. Refresh your accounts.';
  if (/timed out|timeout/i.test(error.message ?? '')) return 'Connection timed out. Try again.';
  if (error.phase === 'evidence upload' || /photo|evidence/i.test(error.message ?? '') && error.status === 400) return 'Photo upload failed. Try again.';
  if (error.status === 400 || error.status === 422) {
    if (/location|coordinates|barangay|PSGC/i.test(error.message ?? '')) return 'Choose a report location in Albay.';
    if (/description is required/i.test(error.message ?? '')) return 'Add details about the issue.';
    return 'Check your report details and try again.';
  }
  if (error.status === 409) return 'Couldn’t confirm submission. Try again.';
  if (/connect|network/i.test(error.message ?? '')) return 'Connection failed. Try again.';
  return 'Couldn’t send your report. Try again.';
}

export function requestPhaseFailureMessage(
  phase: RequestPhase,
  kind: "timeout" | "network",
) {
  if (phase === "evidence upload") {
    return kind === "timeout"
      ? "Upload timed out; your report is still here. Retry upload."
      : "Upload could not connect; your report is still here. Retry upload.";
  }
  if (phase === "final submit") {
    return kind === "timeout"
      ? "Final submit timed out; your report is still here. Retry submission."
      : "Final submit could not connect; your report is still here. Retry submission.";
  }
  if (phase === "metadata") {
    return kind === "timeout"
      ? "Report setup timed out. Try again."
      : "Report setup could not connect. Try again.";
  }
  if (phase === "refresh") {
    return kind === "timeout"
      ? "Refresh timed out. Pull to try again."
      : "Refresh could not connect. Pull to try again.";
  }
  return kind === "timeout"
    ? "Aleconnect took too long to respond. Try again."
    : "Cannot reach Aleconnect. Check your connection and try again.";
}

export async function mapWithConcurrency<Item, Result>(
  items: readonly Item[],
  limit: number,
  operation: (item: Item, index: number) => Promise<Result>,
) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Concurrency limit must be a positive integer.");
  }
  const results = new Array<Result>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await operation(items[index]!, index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}
