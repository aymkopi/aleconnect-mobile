export const CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES = [
  "pending",
  "conflict",
  "approved",
  "denied",
  "superseded",
] as const;

export type ConsumerAccountLinkRequestStatus = (typeof CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES)[number];

const labels: Record<ConsumerAccountLinkRequestStatus, string> = {
  pending: "Pending review",
  conflict: "Needs staff review",
  approved: "Approved",
  denied: "Denied",
  superseded: "No longer active",
};

export function parseConsumerAccountLinkRequestStatus(value: unknown): ConsumerAccountLinkRequestStatus | null {
  return typeof value === "string"
    && (CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES as readonly string[]).includes(value)
    ? value as ConsumerAccountLinkRequestStatus
    : null;
}

export function consumerAccountLinkRequestStatusLabel(value: unknown) {
  const status = parseConsumerAccountLinkRequestStatus(value);
  return status ? labels[status] : "Status unavailable";
}
