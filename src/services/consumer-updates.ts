import { apiRequest } from "@/services/api";
import { normalizeConsumerUpdates, normalizeConsumerUpdateReceipt } from "@/features/reports/consumer-updates-contract";
import type { QueuedConsumerUpdate } from "./consumer-update-queue-core";
export async function fetchConsumerUpdates(ticketId: string, serviceAccountId: string, cursor?: string) {
  const params = new URLSearchParams({ serviceAccountId });
  if (cursor) params.set("cursor", cursor);
  const result = await apiRequest<unknown>(`/api/mobile/complaints/${encodeURIComponent(ticketId)}/consumer-updates?${params}`, {}, { phase: "metadata" });
  return normalizeConsumerUpdates(result);
}
export async function fetchConsumerUpdateEvidence(ticketId:string,serviceAccountId:string,eventId:string){
  const response=await apiRequest<{eventId?:unknown;imageUrls?:unknown}>(`/api/mobile/complaints/${encodeURIComponent(ticketId)}/consumer-updates?${new URLSearchParams({serviceAccountId,evidenceEventId:eventId})}`,{},{phase:'metadata'});
  if(response.eventId!==eventId||!Array.isArray(response.imageUrls)||response.imageUrls.length>3||response.imageUrls.some(url=>typeof url!=='string'||!url.startsWith('https://')))throw new Error('Photo access could not be confirmed.');
  return response.imageUrls as string[];
}
export async function createConsumerUpdateUploads(item: QueuedConsumerUpdate, authToken: string) {
  return apiRequest<{ draftId: string; uploads: { key: string; uploadUrl: string }[] }>(`/api/mobile/complaints/${encodeURIComponent(item.ticketId)}/consumer-updates/evidence-upload`, { method: "POST", body: JSON.stringify({ ...item.payload,clientMutationId:item.id,serviceAccountId: item.serviceAccountId, accessRevision: item.accessRevision, count: item.evidence.length }) }, { authToken, phase: "metadata", timeoutMs: 15_000 });
}
export async function sendConsumerUpdate(item: QueuedConsumerUpdate, authToken: string) {
  const response = await apiRequest<unknown>(`/api/mobile/complaints/${encodeURIComponent(item.ticketId)}/consumer-updates`, { method: "POST", body: JSON.stringify({ ...item.payload, clientMutationId: item.id, serviceAccountId: item.serviceAccountId, accessRevision: item.accessRevision, imageKeys: item.imageKeys, draftIds: item.draftIds }) }, { authToken, phase: "final submit", idempotent: true, timeoutMs: 30_000 });
  return normalizeConsumerUpdateReceipt(response, item.id, item.ticketId);
}
