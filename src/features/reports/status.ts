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
  if (!status) return "neutral";
  if (status === "under_review") return "warning";
  if (status === "verified") return "accent";
  if (status === "rejected") return "danger";
  if (status === "resolved" || status === "closed") return "success";
  return "warning";
}

export function consumerTicketStatusColors(value: unknown, dark: boolean) {
  const status = parseConsumerTicketStatus(value);
  const palette = {
    under_review: ["#FEF3C7", "#854D0E", "#30250D", "#FDE68A"],
    verified: ["#DBEAFE", "#1D4ED8", "#10213B", "#93C5FD"],
    dispatched: ["#EDE9FE", "#6D28D9", "#261B3C", "#C4B5FD"],
    in_progress: ["#FFEDD5", "#9A3412", "#35200E", "#FDBA74"],
    resolved: ["#DCFCE7", "#166534", "#102B20", "#86EFAC"],
    closed: ["#DCFCE7", "#166534", "#102B20", "#86EFAC"],
    rejected: ["#FEE2E2", "#B91C1C", "#351619", "#FCA5A5"],
  };
  const colors = status ? palette[status] : ["#E5E7EB", "#374151", "#1F2937", "#E5E7EB"];
  return { background: colors[dark ? 2 : 0], foreground: colors[dark ? 3 : 1] };
}
