export function ticketIdFromPushData(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.context !== "ticket") return null;
  const ticketId = typeof value.ticketId === "string" ? value.ticketId : value.entityId;
  return typeof ticketId === "string" && ticketId.trim() ? ticketId : null;
}
