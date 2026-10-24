export type ConsumerUpdateKind = "consumer_update" | "resolution_confirmed" | "resolution_disputed";
export type ConsumerUpdatePayload = { kind: ConsumerUpdateKind; text: string; cycleId: string | null; responseVersion: number };
export type ConsumerUpdateReceipt = { mutationId: string; eventId: string; ticketId: string; acceptedAt: string; reviewVersion: number };
export type ConsumerReportEvent = { id: string; kind: string; text: string; imageUrls: string[]; author: "ALECO" | "Consumer"; createdAt: string; reviewState: "pending" | "awaiting_superadmin" | "addressed" | null; reviewVersion: number };
export type ConsumerUpdatesPage = { enabled: boolean; canWrite: boolean; events: ConsumerReportEvent[]; nextCursor: string | null; resolutionCheck: { cycleId: string; responseVersion: number; answer: "confirmed" | "still_exists" | null; reviewState: string | null } | null };
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const version = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const instant = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const review = (value: unknown): ConsumerReportEvent["reviewState"] => value === "pending" || value === "awaiting_superadmin" || value === "addressed" ? value : null;
export function normalizeConsumerUpdates(value: unknown): ConsumerUpdatesPage {
  const source = record(value);
  if (source.enabled !== true || (source.version !== undefined && source.version !== 1)) return { enabled: false, canWrite: false, events: [], nextCursor: null, resolutionCheck: null };
  const events = (Array.isArray(source.events) ? source.events : []).slice(0, 50).flatMap(value => {
    const row = record(value);
    if (!uuid(row.id) || !instant(row.createdAt) || typeof row.text !== "string" || row.text.length > 2000 || !version(row.reviewVersion) || !["consumer_update", "resolution_confirmed", "resolution_disputed", "staff_reply", "staff_address", "staff_escalate", "staff_reopen"].includes(String(row.kind))) return [];
    const imageUrls = (Array.isArray(row.imageUrls) ? row.imageUrls : []).filter((url): url is string => { try { return typeof url === "string" && new URL(url).protocol === "https:"; } catch { return false; } }).slice(0, 3);
    return [{ id: row.id, kind: String(row.kind), text: row.text, imageUrls, author: String(row.kind).startsWith("staff_") ? "ALECO" as const : "Consumer" as const, createdAt: row.createdAt, reviewState: review(row.reviewState), reviewVersion: row.reviewVersion }];
  });
  const check = record(source.resolutionCheck);
  const resolutionCheck = uuid(check.cycleId) && version(check.responseVersion) && (check.answer === null || check.answer === "confirmed" || check.answer === "still_exists") ? { cycleId: check.cycleId, responseVersion: check.responseVersion, answer: check.answer as "confirmed" | "still_exists" | null, reviewState: review(check.reviewState) } : null;
  return { enabled: true, canWrite: source.canWrite === true, events, nextCursor: typeof source.nextCursor === "string" && source.nextCursor.length <= 300 ? source.nextCursor : null, resolutionCheck };
}
export function normalizeConsumerUpdateReceipt(value: unknown, mutationId: string, ticketId: string): ConsumerUpdateReceipt {
  const row = record(value);
  if (row.mutationId !== mutationId || row.ticketId !== ticketId || !uuid(row.eventId) || !instant(row.acceptedAt) || !version(row.reviewVersion)) throw new Error("The server receipt could not be confirmed. Your saved update is kept for retry.");
  return { mutationId, ticketId, eventId: row.eventId, acceptedAt: row.acceptedAt, reviewVersion: row.reviewVersion };
}
export function createConsumerUpdateId() {
  // Retry identifiers are not authentication secrets; Hermes may lack Web Crypto.
  return globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => { const n = Math.floor(Math.random() * 16); return (char === "x" ? n : (n & 3) | 8).toString(16); });
}
