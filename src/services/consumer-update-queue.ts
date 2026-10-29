import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { apiRequest, getAuthToken, getAuthTokenRevision, ApiRequestError, type AuthSession } from "@/services/api";
import { createKeyedSerialExecutor, createPromiseRegistry } from "@/utils/async-coordination";
import { deleteReportEvidence, readEvidencePhoto } from "@/utils/evidence-image-processing";
import { uploadEvidenceToR2 } from "@/services/reports";
import { createConsumerUpdateUploads, sendConsumerUpdate, fetchConsumerUpdateReceipt } from "./consumer-updates";
import { normalizeConsumerIdentity } from "@/features/accounts/contract";
import { createConsumerUpdateId, type ConsumerUpdatePayload } from "@/features/reports/consumer-updates-contract";
import { consumerUpdateScopeCurrent, runQueuedConsumerUpdate, recoverQueuedConsumerReceipt, parseConsumerWorkQueue, isOutageAcknowledgement, type ConsumerUpdateScope, type QueuedConsumerUpdate, type QueuedConsumerWork, type QueuedOutageAcknowledgement } from "./consumer-update-queue-core";
import { sendOutageAcknowledgement } from "./service-status";
import type { OutageItem } from "@/features/home/service-status-contract";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import {cacheConsumerUpdateReceipt} from './consumer-updates-cache';

export type { ConsumerUpdateScope, QueuedConsumerUpdate, QueuedOutageAcknowledgement } from "./consumer-update-queue-core";
const storageKey = "consumer_report_updates_v1";
const mutate = createKeyedSerialExecutor();
const syncs = createPromiseRegistry<string, QueuedConsumerUpdate[]>();
const listeners = new Set<() => void>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function readQueue(): Promise<QueuedConsumerWork[]> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return [];
  return parseConsumerWorkQueue(raw);
}
async function changeQueue(change: (rows: QueuedConsumerWork[]) => QueuedConsumerWork[]) {
  return mutate(storageKey, async () => { const next = change(await readQueue()); await AsyncStorage.setItem(storageKey, JSON.stringify(next)); listeners.forEach(listener => listener()); return next; });
}
export function subscribeConsumerUpdates(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
async function listConsumerWork(scope: ConsumerUpdateScope) {
  return (await readQueue()).filter(item => item.principalId === scope.principalId && item.identityUserId === scope.identityUserId && scope.authorizedServiceAccountIds.includes(item.serviceAccountId));
}
export async function listConsumerUpdates(scope: ConsumerUpdateScope, ticketId?: string) {
  return (await listConsumerWork(scope)).filter((item): item is QueuedConsumerUpdate => !isOutageAcknowledgement(item) && (!ticketId || item.ticketId === ticketId));
}
export async function listOutageAcknowledgements(scope: ConsumerUpdateScope, serviceAccountId?: string) {
  return (await listConsumerWork(scope)).filter((item): item is QueuedOutageAcknowledgement => isOutageAcknowledgement(item) && (!serviceAccountId||item.serviceAccountId === serviceAccountId));
}
export async function enqueueOutageAcknowledgement(scope: ConsumerUpdateScope, serviceAccountId: string, notice: OutageItem) {
  if (!scope.authorizedServiceAccountIds.includes(serviceAccountId) || notice.state !== "active") throw new Error("Review the selected account and current notice.");
  let id: string = createConsumerUpdateId();
  await changeQueue(rows => {
    const existing = rows.find(row => isOutageAcknowledgement(row) && consumerUpdateScopeCurrent(row, scope) && row.serviceAccountId === serviceAccountId && row.payload.advisoryId === notice.advisoryId && row.payload.occurrenceId === notice.occurrenceId && row.payload.publicationRevision === notice.publicationRevision);
    if (existing) { id = existing.id; return rows; }
    return [...rows, { id, principalId: scope.principalId, identityUserId: scope.identityUserId, accessRevision: scope.accessRevision, serviceAccountId, createdAt: new Date().toISOString(), status: "queued", attempts: 0, error: null, nextAttemptAt: 0, payload: { kind: "outage_acknowledgement", advisoryId: notice.advisoryId, occurrenceId: notice.occurrenceId, publicationRevision: notice.publicationRevision }, evidence: [], imageKeys: [], draftIds: [], receipt: null }];
  });
  return id;
}
export async function saveConsumerUpdateDraft(input: { id?: string; scope: ConsumerUpdateScope; serviceAccountId: string; ticketId: string; payload: ConsumerUpdatePayload; evidence: QueuedConsumerUpdate["evidence"] }) {
  if (!input.scope.authorizedServiceAccountIds.includes(input.serviceAccountId)) throw new Error("This service account is unavailable.");
  const id = input.id ?? createConsumerUpdateId();
  const draft: QueuedConsumerUpdate = { id, principalId: input.scope.principalId, identityUserId: input.scope.identityUserId, serviceAccountId: input.serviceAccountId, accessRevision: input.scope.accessRevision, ticketId: input.ticketId, createdAt: new Date().toISOString(), status: "draft", attempts: 0, error: null, nextAttemptAt: 0, payload: input.payload, evidence: input.evidence, imageKeys: [], draftIds: [], receipt: null };
  await changeQueue(rows => {
    const old = rows.find(row => row.id === id);
    if (old && (old.status !== "draft" || !consumerUpdateScopeCurrent(old, input.scope))) throw new Error("This saved update cannot be changed under the current account.");
    return old ? rows.map(row => row.id === id ? { ...draft, createdAt: old.createdAt } : row) : [...rows, draft];
  });
  return id;
}
export async function enqueueConsumerUpdate(id: string, scope: ConsumerUpdateScope) {
  await changeQueue(rows => {
    if (!rows.some(row => row.id === id)) throw new Error("Save this draft before sending.");
    return rows.map(row => {
    if (row.id !== id) return row;
    if (!consumerUpdateScopeCurrent(row, scope) || row.status !== "draft") throw new Error("Review this draft under its original account before sending.");
    if (isOutageAcknowledgement(row)) throw new Error("Use the acknowledgement choice for this saved action.");
    if (row.payload.kind === "consumer_update" && !row.payload.text.trim()) throw new Error("Describe your update before sending.");
    return { ...row, status: "queued" as const };
    });
  });
}
async function persist(item: QueuedConsumerWork) {
  await changeQueue(rows => {
    if (!rows.some(row => row.id === item.id)) throw new Error("This local update was removed; sending has stopped.");
    return rows.map(row => row.id === item.id ? item : row);
  });
  if(!isOutageAcknowledgement(item)&&item.status==='sent')await cacheConsumerUpdateReceipt(item).catch(()=>{});
}
export async function retryConsumerUpdate(id: string, scope: ConsumerUpdateScope) {
  await changeQueue(rows => rows.map(row => {
    if (row.id !== id) return row;
    if (!consumerUpdateScopeCurrent(row, scope) || !["failed", "queued"].includes(row.status)) throw new Error("Review the saved details before creating a new update.");
    if(/RATE_LIMIT/.test(row.errorCode??'')&&row.nextAttemptAt>Date.now())throw new ApiRequestError('Too many requests. Try again later.',429,undefined,'final submit',false,'RATE_LIMITED',Math.ceil((row.nextAttemptAt-Date.now())/1000));
    return { ...row, status: "queued" as const, nextAttemptAt: 0 };
  }));
  return syncConsumerUpdateQueue();
}
export async function recoverConsumerUpdateReceipt(id: string, scope: ConsumerUpdateScope) {
  const item = (await listConsumerUpdates(scope)).find(row => row.id === id);
  if (!item) throw Error('This saved update is unavailable.');
  const token = await getAuthToken(), revision = getAuthTokenRevision();
  if (!token) throw Error('Sign in to check this submission.');
  return recoverQueuedConsumerReceipt(item,scope,{
    read: value => fetchConsumerUpdateReceipt(value,token),
    current: () => revision === getAuthTokenRevision(),
    persist: async value => {
      if (revision !== getAuthTokenRevision() || await getAuthToken() !== token) throw Error('Your sign-in changed. The saved update is kept.');
      await persist(value);
    },
  });
}
export async function discardConsumerUpdate(id: string, scope: ConsumerUpdateScope) {
  await changeQueue(rows => {
    const row = rows.find(value => value.id === id);
    if (!row || row.principalId !== scope.principalId || row.identityUserId !== scope.identityUserId || !scope.authorizedServiceAccountIds.includes(row.serviceAccountId) || row.status === "sending") throw new Error("This update cannot be discarded while sending or under another account.");
    return rows.filter(value => value.id !== id);
  });
  deleteReportEvidence(`consumer-update-${id}`);
}
export async function syncConsumerUpdateQueue() {
  if (PANELUI_PREVIEW) return [];
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return [];
  const token = await getAuthToken();
  if (!token) return [];
  const session = await apiRequest<AuthSession>("/api/auth/get-session", {}, { authToken: token, phase: "metadata" });
  return syncs.run(session.user.id, async () => {
    const identity = normalizeConsumerIdentity(await apiRequest<unknown>("/api/mobile/consumer-identity", {}, { authToken: token, phase: "metadata" }), session.user);
    const scope = { ...identity, principalId: session.user.id };
    if (await getAuthToken() !== token) return listConsumerUpdates(scope);
    for (const item of await listConsumerWork(scope)) {
      if (isOutageAcknowledgement(item) ? identity.capabilities.outageAcknowledgements !== true : identity.capabilities.reportUpdates !== true) continue;
      if (item.status === "draft" || item.status === "needs_attention" || item.status === "sent" && !item.evidence.length || item.status === "failed" && item.nextAttemptAt > Date.now()) continue;
      await runQueuedConsumerUpdate(item, scope, {
        persist,
        send: async (value, prepared) => {
          if (await getAuthToken() !== token) throw new ApiRequestError("Your sign-in changed. The saved update is kept.", 409, undefined, "final submit", false, "STALE_ACCESS_REVISION");
          if (isOutageAcknowledgement(value)) return sendOutageAcknowledgement(value, token);
          let sending = value;
          if (sending.evidence.length && !sending.imageKeys.length) {
            const upload = await createConsumerUpdateUploads(sending, token);
            if (upload.uploads.length !== sending.evidence.length || !uuid.test(upload.draftId)) throw new Error("The photo upload could not be prepared. Try again.");
            for (let index = 0; index < upload.uploads.length; index++) await uploadEvidenceToR2(upload.uploads[index].uploadUrl, await readEvidencePhoto(sending.evidence[index].uri));
            const next = { imageKeys: upload.uploads.map(item => item.key), draftIds: [upload.draftId] };
            await prepared(next); sending = { ...sending, ...next };
          }
          if (await getAuthToken() !== token) throw new ApiRequestError("Your sign-in changed. The saved update is kept.", 409, undefined, "final submit", false, "STALE_ACCESS_REVISION");
          return sendConsumerUpdate(sending, token);
        },
        cleanup: async value => { deleteReportEvidence(`consumer-update-${value.id}`); },
      });
    }
    return listConsumerUpdates(scope);
  });
}
