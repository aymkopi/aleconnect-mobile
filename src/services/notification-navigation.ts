import type { MobileNotification } from "./notifications";

export type MobileNotificationDestination =
  | { pathname: "/report/[id]"; params: { id: string; focus: "notification" } }
  | { pathname: "/advisory/[id]"; params: { id: string; focus: "notification" } };

export type TicketStatusChangedPush = {
  context: "ticket";
  event: "ticket.status_changed";
  version: 1;
  ticketId: string;
  ticketNumber?: string;
  status: string;
  changedAt: string;
  revision?: number;
};

export function notificationDestinationFromNotification(
  notification: Pick<MobileNotification, "ticketId" | "entityType" | "entityId">,
): MobileNotificationDestination | null {
  if (notification.ticketId) {
    return {
      pathname: "/report/[id]",
      params: { id: notification.ticketId, focus: "notification" },
    };
  }
  if (notification.entityType === "advisory" && notification.entityId) {
    return {
      pathname: "/advisory/[id]",
      params: { id: notification.entityId, focus: "notification" },
    };
  }
  return null;
}

export function ticketIdFromPushData(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.context !== "ticket") return null;
  const ticketId = typeof value.ticketId === "string" ? value.ticketId : value.entityId;
  return typeof ticketId === "string" && ticketId.trim() ? ticketId : null;
}

export function ticketStatusChangedEventFromPushData(
  data: unknown,
): TicketStatusChangedPush | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (
    value.context !== "ticket" ||
    value.event !== "ticket.status_changed" ||
    value.version !== 1
  ) {
    return null;
  }

  const ticketId =
    typeof value.ticketId === "string" ? value.ticketId.trim() : "";
  const ticketNumber =
    typeof value.ticketNumber === "string" ? value.ticketNumber.trim() : "";
  const status = typeof value.status === "string" ? value.status.trim() : "";
  const changedAt =
    typeof value.changedAt === "string" ? value.changedAt.trim() : "";
  const changedAtMs = Date.parse(changedAt);
  const revision = value.revision;

  if (!ticketId || !status || !changedAt || Number.isNaN(changedAtMs)) {
    return null;
  }
  if (
    revision !== undefined &&
    (!Number.isInteger(revision) || Number(revision) < 0)
  ) {
    return null;
  }

  return {
    context: "ticket",
    event: "ticket.status_changed",
    version: 1,
    ticketId,
    ...(ticketNumber ? { ticketNumber } : {}),
    status,
    changedAt: new Date(changedAtMs).toISOString(),
    ...(revision === undefined ? {} : { revision: Number(revision) }),
  };
}

export function advisoryIdFromPushData(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.context !== "advisory" && value.entityType !== "advisory") {
    return null;
  }
  const advisoryId =
    typeof value.advisoryId === "string" ? value.advisoryId : value.entityId;
  return typeof advisoryId === "string" && advisoryId.trim()
    ? advisoryId
    : null;
}
