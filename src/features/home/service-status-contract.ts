export type OutageItem = {
  outageDate?:string;expiresAt?:string|null;
  advisoryId: string; occurrenceId: string | null; controlNumber: string; title: string; note: string;
  state: "active" | "planned"; matchBasis: "all" | "area_mapping"; publicationRevision: number; publishedAt: string;
  scheduledStartAt: string | null; scheduledEndAt: string | null; dateOnly: boolean; occurrenceDate: string | null;
};
export type ServiceStatus = { enabled: false } | { enabled: true; version: 1; serviceAccountId: string; asOf: string; matchState: "matched" | "no_confirmed_match" | "coverage_unknown"; multipleFeeders: boolean; hasMore: boolean; canAcknowledge: boolean; items: OutageItem[]; isStale?: boolean };
export type OutageScope = { principalId: string; identityUserId: string; accessRevision: number; serviceAccountId: string };
export type OutageReceipt = { mutationId: string; acknowledgementId: string; advisoryId: string; occurrenceId: string | null; serviceAccountId: string; acceptedAt: string };
export const outageUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const instant = (value: unknown): value is string => typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export function serviceStatusScopeKey(scope: OutageScope) { return [scope.principalId, scope.identityUserId, scope.accessRevision, scope.serviceAccountId].map(value => encodeURIComponent(String(value))).join(":"); }
export function normalizeServiceStatus(raw: unknown, serviceAccountId: string): ServiceStatus {
  const value = object(raw);
  if (value.enabled === false) return { enabled: false };
  if (value.enabled !== true || value.version !== 1 || value.serviceAccountId !== serviceAccountId || !instant(value.asOf) || !["matched", "no_confirmed_match", "coverage_unknown"].includes(String(value.matchState)) || !Array.isArray(value.items) || value.items.length > 50 || (value.matchState === "matched") !== Boolean(value.items.length)) throw new Error("Current outage context could not be verified.");
  const items = value.items.map(rawItem => {
    const item = object(rawItem);
    if (typeof item.advisoryId !== "string" || !outageUuid.test(item.advisoryId) || item.occurrenceId !== null && (typeof item.occurrenceId !== "string" || !outageUuid.test(item.occurrenceId)) || !["active", "planned"].includes(String(item.state)) || !["all", "area_mapping"].includes(String(item.matchBasis)) || !Number.isSafeInteger(item.publicationRevision) || Number(item.publicationRevision) < 0 || !instant(item.publishedAt) || !["title", "note", "controlNumber"].every(key => typeof item[key] === "string") || String(item.note).length > 2000 || typeof item.dateOnly !== "boolean" || item.occurrenceDate !== null && (typeof item.occurrenceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.occurrenceDate)) || [item.scheduledStartAt, item.scheduledEndAt].some(date => date !== null && !instant(date))) throw new Error("The official outage notice could not be verified.");
    if (item.outageDate !== undefined && (typeof item.outageDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.outageDate) || new Date(item.outageDate).toISOString().slice(0,10) !== item.outageDate) || item.expiresAt !== undefined && item.expiresAt !== null && !instant(item.expiresAt)) throw new Error("The official outage notice could not be verified.");
    return item as OutageItem;
  });
  return { enabled: true, version: 1, serviceAccountId, asOf: value.asOf, matchState: value.matchState as "matched" | "no_confirmed_match" | "coverage_unknown", multipleFeeders: value.multipleFeeders === true, hasMore: value.hasMore === true, canAcknowledge: value.canAcknowledge === true, items };
}
export function normalizeOutageReceipt(raw: unknown, expected: { id: string; serviceAccountId: string; payload: { advisoryId: string; occurrenceId: string | null } }): OutageReceipt {
  const value = object(raw);
  if (value.mutationId !== expected.id || value.serviceAccountId !== expected.serviceAccountId || value.advisoryId !== expected.payload.advisoryId || value.occurrenceId !== expected.payload.occurrenceId || typeof value.acknowledgementId !== "string" || !outageUuid.test(value.acknowledgementId) || !instant(value.acceptedAt)) throw new Error("ALECO's receipt could not be verified. Your saved acknowledgement is kept for retry.");
  return value as OutageReceipt;
}
