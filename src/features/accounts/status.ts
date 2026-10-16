export const CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES = [
  "pending",
  "conflict",
  "approved",
  "denied",
  "superseded",
] as const;

export type ConsumerAccountLinkRequestStatus = (typeof CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES)[number];

const labels: Record<ConsumerAccountLinkRequestStatus, string> = {
  pending: "Under review",
  conflict: "Needs staff review",
  approved: "Approved",
  denied: "Declined",
  superseded: "No longer active",
};

export function parseConsumerAccountLinkRequestStatus(value: unknown): ConsumerAccountLinkRequestStatus | null {
  return typeof value === "string"
    && (CONSUMER_ACCOUNT_LINK_REQUEST_STATUSES as readonly string[]).includes(value)
    ? value as ConsumerAccountLinkRequestStatus
    : null;
}

export function consumerAccountLinkRequestStatusLabel(value: unknown, isCurrentLink?: boolean) {
  const status = parseConsumerAccountLinkRequestStatus(value);
  if (status === "approved" && isCurrentLink === true) return "Linked";
  if (status === "approved" && isCurrentLink === false) return "Previously approved";
  return status ? labels[status] : "Status unavailable";
}

export function consumerAccountLinkRequestReviewMessage(request: {
  status: unknown;
  consumerReason?: string | null;
  isCurrentLink?: boolean;
}) {
  if (request.consumerReason?.trim()) return request.consumerReason;
  switch (parseConsumerAccountLinkRequestStatus(request.status)) {
    case "pending": return "ALECO is checking your request.";
    case "conflict": return "Please contact consumer services to confirm the registered details.";
    case "approved":
      if (request.isCurrentLink === true) return "This account is linked to your profile. View ALECO accounts for current access.";
      if (request.isCurrentLink === false) return "This approval is historical. The account is no longer linked by this request. View ALECO accounts for current access.";
      return "This request was approved. View ALECO accounts to check current access.";
    case "superseded": return "This request is no longer active. View ALECO accounts to check current access.";
    case "denied": return "Check your bill and contact ALECO if you need help.";
    default: return "This request status is unavailable. Refresh requests or contact ALECO.";
  }
}
