import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getAuthToken } from "@/services/api";
import { normalizeServiceStatus, normalizeOutageReceipt, serviceStatusScopeKey, type OutageScope, type ServiceStatus } from "@/features/home/service-status-contract";
import type { QueuedOutageAcknowledgement } from "./consumer-update-queue-core";
export async function fetchServiceStatus(scope: OutageScope,signal?:AbortSignal): Promise<ServiceStatus> {
  if (signal?.aborted) throw new Error("The outage lookup was cancelled.");
  const token = await getAuthToken();
  if (!token) throw new Error("Sign in to refresh this account's outage context.");
  const key = `account_outage_status_v1:${serviceStatusScopeKey(scope)}`;
  try {
    const value = normalizeServiceStatus(await apiRequest<unknown>(`/api/mobile/service-status?${new URLSearchParams({ serviceAccountId: scope.serviceAccountId })}`, {signal}, { authToken: token, phase: "metadata",timeoutMs:10000 }), scope.serviceAccountId);
    if (signal?.aborted) throw new Error("The outage lookup was cancelled.");
    if (await getAuthToken() !== token) throw Object.assign(new Error("Your sign-in changed. Refresh this account."), { status: 409 });
    // A failed optional cache save must not hide a valid server response.
    try { if (value.enabled) await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value })); else await AsyncStorage.removeItem(key); } catch { /* Live context remains usable. */ }
    return value;
  } catch (error) {
    if (signal?.aborted) throw new Error("The outage lookup was cancelled.");
    if ([401, 403, 409].includes((error as { status?: number }).status ?? 0) || await getAuthToken() !== token) throw error;
    try {
      const saved = JSON.parse(await AsyncStorage.getItem(key) ?? "null");
      if (saved && Number.isFinite(saved.savedAt) && Date.now() - saved.savedAt >= 0 && Date.now() - saved.savedAt <= 86400000) {
        const value = normalizeServiceStatus(saved.value, scope.serviceAccountId);
        if (value.enabled) return { ...value, isStale: true, canAcknowledge: false };
      }
    } catch { /* Unreadable private cache is not evidence of service availability. */ }
    throw error;
  }
}
export async function sendOutageAcknowledgement(item: QueuedOutageAcknowledgement, authToken: string) {
  const raw = await apiRequest<unknown>("/api/mobile/outage-acknowledgements", { method: "POST", body: JSON.stringify({ ...item.payload, clientMutationId: item.id, serviceAccountId: item.serviceAccountId, accessRevision: item.accessRevision }) }, { authToken, phase: "final submit", idempotent: true, timeoutMs: 30000 });
  return normalizeOutageReceipt(raw, item);
}
