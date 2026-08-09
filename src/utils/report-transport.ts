export type RequestPhase =
  | "request"
  | "metadata"
  | "evidence upload"
  | "final submit"
  | "refresh";

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
