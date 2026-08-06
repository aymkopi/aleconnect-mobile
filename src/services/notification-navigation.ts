import type { MobileNotification } from "./notifications";

export type MobileNotificationDestination =
  | { pathname: "/report/[id]"; params: { id: string; focus: "notification" } }
  | { pathname: "/advisory/[id]"; params: { id: string; focus: "notification" } };

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
