export const CONSUMER_TICKET_STATUSES = [
  "under_review",
  "verified",
  "rejected",
  "dispatched",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type ConsumerTicketStatus = (typeof CONSUMER_TICKET_STATUSES)[number];

export function isSupportedConsumerStatusModelVersion(value: unknown): boolean {
  return value === undefined || value === 1;
}

const statusLabels: Record<ConsumerTicketStatus, string> = {
  under_review: "Under review",
  verified: "Verified",
  rejected: "Rejected",
  dispatched: "Dispatched",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function parseConsumerTicketStatus(value: unknown): ConsumerTicketStatus | null {
  return typeof value === "string" &&
    (CONSUMER_TICKET_STATUSES as readonly string[]).includes(value)
    ? value as ConsumerTicketStatus
    : null;
}

export function consumerTicketStatusLabel(value: unknown): string {
  const status = parseConsumerTicketStatus(value);
  return status ? statusLabels[status] : "Status update pending";
}

export type ConsumerTicketStatusTone = "neutral" | "accent" | "warning" | "success" | "danger";

export function consumerTicketStatusTone(value: unknown): ConsumerTicketStatusTone {
  const status = parseConsumerTicketStatus(value);
  if (!status || status === "under_review") return "neutral";
  if (status === "verified") return "accent";
  if (status === "rejected") return "danger";
  if (status === "resolved" || status === "closed") return "success";
  return "warning";
}
