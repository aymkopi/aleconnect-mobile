import { normalizeConsumerUpdateReceipt, type ConsumerUpdatePayload, type ConsumerUpdateReceipt } from "../features/reports/consumer-updates-contract.ts";
import { normalizeOutageReceipt, outageUuid, type OutageReceipt } from "../features/home/service-status-contract.ts";
export type ConsumerUpdateScope = { principalId: string; identityUserId: string; authorizedServiceAccountIds: readonly string[]; accessRevision: number };
export type QueuedConsumerUpdate = {
  id: string; principalId: string; identityUserId: string; serviceAccountId: string; accessRevision: number; ticketId: string; createdAt: string;
  status: "draft" | "queued" | "sending" | "failed" | "needs_attention" | "sent"; attempts: number; error: string | null; errorCode?: string; nextAttemptAt: number;
  payload: ConsumerUpdatePayload; evidence: { id: string; uri: string; size: number }[]; imageKeys: string[]; draftIds: string[]; receipt: ConsumerUpdateReceipt | null;
};
export type QueuedOutageAcknowledgement = Omit<QueuedConsumerUpdate, "ticketId" | "payload" | "receipt"> & { payload: { kind: "outage_acknowledgement"; advisoryId: string; occurrenceId: string | null; publicationRevision: number }; receipt: OutageReceipt | null };
export type QueuedConsumerWork = QueuedConsumerUpdate | QueuedOutageAcknowledgement;
export function isOutageAcknowledgement(item: QueuedConsumerWork): item is QueuedOutageAcknowledgement { return item.payload.kind === "outage_acknowledgement"; }
export function parseConsumerWorkQueue(raw: string | null): QueuedConsumerWork[] {
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(item => {
    if (!item || !outageUuid.test(item.id) || typeof item.principalId !== "string" || typeof item.identityUserId !== "string" || typeof item.serviceAccountId !== "string" || !Number.isSafeInteger(item.accessRevision) || item.accessRevision < 0 || !["draft", "queued", "sending", "failed", "needs_attention", "sent"].includes(item.status) || !item.payload || !Array.isArray(item.evidence) || !Array.isArray(item.imageKeys) || !Array.isArray(item.draftIds)) return true;
    if (isOutageAcknowledgement(item)) {
      if (item.status === "sent" || item.receipt !== null) { try { normalizeOutageReceipt(item.receipt, item); } catch { return true; } }
      return !outageUuid.test(item.payload.advisoryId) || item.payload.occurrenceId !== null && !outageUuid.test(item.payload.occurrenceId) || !Number.isSafeInteger(item.payload.publicationRevision) || item.payload.publicationRevision < 0 || item.evidence.length !== 0 || item.imageKeys.length !== 0 || item.draftIds.length !== 0;
    }
    return typeof item.ticketId !== "string" || !outageUuid.test(item.ticketId) || !["consumer_update", "resolution_confirmed", "resolution_disputed"].includes(item.payload.kind) || typeof item.payload.text !== "string" || item.payload.text.length > 2000 || item.evidence.length > 3 || item.evidence.some((photo: { uri?: unknown; size?: unknown }) => typeof photo.uri !== "string" || !photo.uri.includes(`/report-evidence/consumer-update-${item.id}/`) || photo.uri.includes("..") || !Number.isFinite(photo.size) || Number(photo.size) > 5_000_000);
  })) throw new Error("Saved follow-ups could not be read safely. Nothing was removed.");
  return value;
}
export function consumerUpdateScopeCurrent(item: QueuedConsumerWork, scope: ConsumerUpdateScope) {
  return item.principalId === scope.principalId && item.identityUserId === scope.identityUserId && item.accessRevision === scope.accessRevision && scope.authorizedServiceAccountIds.includes(item.serviceAccountId);
}

export async function recoverQueuedConsumerReceipt(item: QueuedConsumerUpdate, scope: ConsumerUpdateScope, work: {
  read(item: QueuedConsumerUpdate): Promise<unknown>; current(): boolean; persist(item: QueuedConsumerUpdate): Promise<void>;
}) {
  if (item.principalId !== scope.principalId || item.identityUserId !== scope.identityUserId || !scope.authorizedServiceAccountIds.includes(item.serviceAccountId)) throw Error("This saved update belongs to another account.");
  const response = await work.read(item);
  if (!work.current()) throw Error("Your sign-in changed. The saved update is kept.");
  if (response === null) return item;
  const receipt = normalizeConsumerUpdateReceipt(response, item.id, item.ticketId);
  const received: QueuedConsumerUpdate = { ...item, receipt, status: "sent", error: null, errorCode: undefined, nextAttemptAt: 0 };
  await work.persist(received);
  return received;
}
type Work<T> = { persist: (item: T) => Promise<void>; send: (item: T, prepared: (upload: { imageKeys: string[]; draftIds: string[] }) => Promise<void>) => Promise<unknown>; cleanup: (item: T) => Promise<void> };
export async function runQueuedConsumerUpdate<T extends QueuedConsumerWork>(item: T, scope: ConsumerUpdateScope, work: Work<T>): Promise<T> {
  if (!consumerUpdateScopeCurrent(item, scope)) {
    if (item.status === "sent") return item;
    const held: T = { ...item, status: "needs_attention", error: "Your account access changed. Review the saved details before creating a new update; nothing was sent or retargeted.", errorCode: "STALE_ACCESS_REVISION" };
    await work.persist(held); return held;
  }
  let current: T = item;
  if (current.status !== "sent") {
    current = { ...current, status: "sending", attempts: current.attempts + 1, error: null };
    await work.persist(current);
    try {
      const response = await work.send(current, async upload => { current = { ...current, ...upload }; await work.persist(current); });
      const receipt = isOutageAcknowledgement(current) ? normalizeOutageReceipt(response, current) : normalizeConsumerUpdateReceipt(response, current.id, current.ticketId);
      current = { ...current, status: "sent", receipt, error: null, nextAttemptAt: 0 } as T;
      await work.persist(current);
    } catch (error) {
      const failure = error as { status?: number; code?: string; message?: string; retryAfterSeconds?:number };
      const permanent = [400, 401, 403, 404, 409, 413, 422].includes(failure.status ?? 0);
      current = { ...current, status: permanent ? "needs_attention" : "failed", error: failure.message ?? "This update could not be sent. Your saved details are kept.", errorCode: failure.code??(failure.status===429?'RATE_LIMITED':undefined), nextAttemptAt: Date.now() + (failure.status===429?Math.max(60,failure.retryAfterSeconds??60)*1000:Math.min(900_000, 5_000 * 2 ** Math.min(current.attempts, 8))) };
      await work.persist(current); return current;
    }
  }
  if (current.evidence.length) {
    try { await work.cleanup(current); current = { ...current, evidence: [] }; await work.persist(current); } catch { /* The accepted receipt stays durable; retry cleanup without resending. */ }
  }
  return current;
}
