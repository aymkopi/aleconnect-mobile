import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ticketStatusChangedEventFromPushData,
  type TicketStatusChangedPush,
} from "@/services/notification-navigation";
import {
  complaintReportsNeedRevalidation,
  markComplaintReportsForRevalidation,
  projectComplaintReportStatus,
} from "@/services/reports";
import {
  isIncomingReportStatusEventNewer,
  type ReportStatusEventMarker,
} from "@/services/report-sync-ordering";

export type ReportStatusChangedEvent = TicketStatusChangedPush & {
  userId: string;
};

type ReportStatusChangedListener = (event: ReportStatusChangedEvent) => void;
type ReportRevalidationListener = (userId: string) => void;

const markerPrefix = "report_status_event_markers_v1";
const markerMemory = new Map<
  string,
  Record<string, ReportStatusEventMarker>
>();
const markerOperations = new Map<string, Promise<unknown>>();
const statusListeners = new Set<ReportStatusChangedListener>();
const revalidationListeners = new Set<ReportRevalidationListener>();

function markerKey(userId: string) {
  return `${markerPrefix}:${userId}`;
}

function serializeMarkerOperation<T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = markerOperations.get(userId) ?? Promise.resolve();
  const result = previous.then(operation, operation);
  markerOperations.set(
    userId,
    result.then(
      () => undefined,
      () => undefined,
    ),
  );
  return result;
}

async function readMarkers(
  userId: string,
): Promise<Record<string, ReportStatusEventMarker>> {
  const inMemory = markerMemory.get(userId);
  if (inMemory) return { ...inMemory };

  try {
    const raw = await AsyncStorage.getItem(markerKey(userId));
    if (!raw) {
      markerMemory.set(userId, {});
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, ReportStatusEventMarker>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      markerMemory.set(userId, {});
      return {};
    }

    markerMemory.set(userId, parsed);
    return { ...parsed };
  } catch (error) {
    console.warn("Failed to read report status event ordering", error);
    const fallback = markerMemory.get(userId) ?? {};
    return { ...fallback };
  }
}

export function subscribeReportStatusChanged(
  listener: ReportStatusChangedListener,
) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function subscribeReportRevalidationRequested(
  listener: ReportRevalidationListener,
) {
  revalidationListeners.add(listener);
  return () => revalidationListeners.delete(listener);
}

export function requestReportRevalidation(userId: string): void {
  if (!userId) return;
  markComplaintReportsForRevalidation(userId);
  revalidationListeners.forEach((listener) => listener(userId));
}

export async function handleReportStatusPush(
  data: unknown,
  userId: string,
): Promise<boolean> {
  const event = ticketStatusChangedEventFromPushData(data);
  if (!event || !userId) return false;

  return serializeMarkerOperation(userId, async () => {
    const markers = await readMarkers(userId);
    const current = markers[event.ticketId] ?? null;
    if (!isIncomingReportStatusEventNewer(current, event)) return false;

    const nextMarker: ReportStatusEventMarker = {
      changedAt: event.changedAt,
      ...(event.revision === undefined ? {} : { revision: event.revision }),
    };
    const nextMarkers = {
      ...markers,
      [event.ticketId]: nextMarker,
    };
    markerMemory.set(userId, nextMarkers);

    const accepted = { ...event, userId } satisfies ReportStatusChangedEvent;
    statusListeners.forEach((listener) => listener(accepted));
    requestReportRevalidation(userId);

    void AsyncStorage.setItem(markerKey(userId), JSON.stringify(nextMarkers)).catch(
      (error) => {
        console.warn("Failed to persist report status event ordering", error);
      },
    );

    void projectComplaintReportStatus({
      userId,
      ticketId: event.ticketId,
      status: event.status,
    }).catch((error) => {
      console.warn("Failed to project report status into cache", error);
    });

    return true;
  });
}

export function hasPendingReportRevalidation(userId: string) {
  return complaintReportsNeedRevalidation(userId);
}
