import type { MobileNotification } from "./notifications";
import { parseConsumerTicketStatus, type ConsumerTicketStatus } from "../features/reports/status.ts";

export type MobileNotificationDestination =
  | { pathname: "/report/[id]"; params: { id: string; focus: "notification"; serviceAccountId?: string } }
  | { pathname: "/advisory/[id]"; params: { id: string; focus: "notification" } }
  | { pathname: "/profile/accounts"; params: { requestId?: string; decision?: string } };

export type TicketStatusChangedPush = {
  context: "ticket";
  event: "ticket.status_changed";
  version: 1;
  statusModelVersion?: 1;
  ticketId: string;
  ticketNumber?: string;
  status: ConsumerTicketStatus;
  changedAt: string;
  revision?: number;
  serviceAccountId?: string;
};

export type TicketStatusChangedPushClassification =
  | { kind: "valid"; event: TicketStatusChangedPush }
  | { kind: "unsupported"; ticketId: string }
  | { kind: "unrelated" };

export function notificationDestinationFromNotification(
  notification: Pick<MobileNotification, "ticketId" | "entityType" | "entityId" | "serviceAccountId">,
): MobileNotificationDestination | null {
  if (notification.ticketId) {
    return {
      pathname: "/report/[id]",
      params: { id: notification.ticketId, focus: "notification", ...(notification.serviceAccountId ? { serviceAccountId: notification.serviceAccountId } : {}) },
    };
  }
  if (notification.entityType === "account_linking") {
    return { pathname: "/profile/accounts", params: notification.entityId ? { requestId: notification.entityId } : {} };
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

export function classifyTicketStatusChangedPushData(data: unknown): TicketStatusChangedPushClassification {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { kind: "unrelated" };
  const value = data as Record<string, unknown>;
  if (
    value.context !== "ticket" ||
    value.event !== "ticket.status_changed"
  ) {
    return { kind: "unrelated" };
  }

  const ticketId =
    typeof value.ticketId === "string" ? value.ticketId.trim() : "";
  if (!ticketId) return { kind: "unrelated" };
  if (value.version !== 1) return { kind: "unsupported", ticketId };
  if (value.statusModelVersion !== undefined && value.statusModelVersion !== 1) {
    return { kind: "unsupported", ticketId };
  }
  const ticketNumber =
    typeof value.ticketNumber === "string" ? value.ticketNumber.trim() : "";
  const status = parseConsumerTicketStatus(value.status);
  const changedAt =
    typeof value.changedAt === "string" ? value.changedAt.trim() : "";
  const changedAtMs = Date.parse(changedAt);
  const revision = value.revision;
  const serviceAccountId = typeof value.serviceAccountId === "string" ? value.serviceAccountId.trim() : "";

  if (!ticketId || !status || !changedAt || Number.isNaN(changedAtMs)) {
    return { kind: "unsupported", ticketId };
  }
  if (
    revision !== undefined &&
    (!Number.isInteger(revision) || Number(revision) < 0)
  ) {
    return { kind: "unsupported", ticketId };
  }

  return { kind: "valid", event: {
    context: "ticket",
    event: "ticket.status_changed",
    version: 1,
    ...(value.statusModelVersion === 1 ? { statusModelVersion: 1 as const } : {}),
    ticketId,
    ...(ticketNumber ? { ticketNumber } : {}),
    status,
    changedAt: new Date(changedAtMs).toISOString(),
    ...(revision === undefined ? {} : { revision: Number(revision) }),
    ...(serviceAccountId ? { serviceAccountId } : {}),
  } };
}

export function ticketStatusChangedEventFromPushData(
  data: unknown,
): TicketStatusChangedPush | null {
  const classification = classifyTicketStatusChangedPushData(data);
  return classification.kind === "valid" ? classification.event : null;
}

export type AccountLinkingPush = { context: "account_linking"; requestId: string; decision?: "approved" | "denied" };

export function accountLinkingPushFromData(data: unknown): AccountLinkingPush | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (value.context !== "account_linking" || typeof value.requestId !== "string" || !value.requestId.trim()) return null;
  const decision = value.decision === "approved" || value.decision === "denied" ? value.decision : undefined;
  return { context: "account_linking", requestId: value.requestId.trim(), ...(decision ? { decision } : {}) };
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
