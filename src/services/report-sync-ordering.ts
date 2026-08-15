export type ReportStatusEventMarker = {
  changedAt: string;
  revision?: number;
};

export function isIncomingReportStatusEventNewer(
  current: ReportStatusEventMarker | null,
  incoming: ReportStatusEventMarker,
) {
  if (!current) return true;

  if (
    current.revision !== undefined &&
    incoming.revision !== undefined
  ) {
    return incoming.revision > current.revision;
  }

  const currentMs = Date.parse(current.changedAt);
  const incomingMs = Date.parse(incoming.changedAt);
  if (Number.isNaN(currentMs) || Number.isNaN(incomingMs)) return false;
  return incomingMs > currentMs;
}
