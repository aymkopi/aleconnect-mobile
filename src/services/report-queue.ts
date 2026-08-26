import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { ApiRequestError, apiRequest, getAuthToken } from "@/services/api";
import { normalizeConsumerIdentity, normalizeLinkedAccounts, readConsistentConsumerAccountSnapshot } from "@/features/accounts/contract";
import { requestReportRevalidation } from "@/services/report-sync-events";
import { evaluateQueuedReportAccess, isQueuedReportVisible } from "@/services/report-queue-access";
import {
  clearReportListCache,
  createEvidenceUploads,
  submitComplaint,
  uploadEvidenceToR2,
  type SubmitComplaintInput,
} from "@/services/reports";
import {
  createKeyedSerialExecutor,
  createPromiseRegistry,
} from "@/utils/async-coordination";
import {
  deleteReportEvidence,
  readEvidencePhoto,
  type PreparedEvidencePhoto,
} from "@/utils/evidence-image-processing";
import {
  mapWithConcurrency,
  requestPhaseFailureMessage,
  type RequestPhase,
} from "@/utils/report-transport";

export type ReportQueueStatus =
  | "queued"
  | "submitting"
  | "failed"
  | "submitted";

export type ReportQueueItem = {
  id: string;
  idempotencyKey: string;
  userId: string;
  identityUserId?: string;
  serviceAccountId?: string;
  accessRevision?: number;
  nonRetryable?: boolean;
  createdAt: string;
  updatedAt: string;
  status: ReportQueueStatus;
  attempts: number;
  lastError: string | null;
  lastErrorPhase: RequestPhase | null;
  diagnosticId: string | null;
  ticketId: string | null;
  ticketNumber: string | null;
  title: string;
  payload: Omit<
    SubmitComplaintInput,
    "idempotencyKey" | "draftIds" | "imageKeys"
  >;
  evidence: PreparedEvidencePhoto[];
};

export type ReportQueueInput = Pick<
  ReportQueueItem,
  "id" | "idempotencyKey" | "userId" | "identityUserId" | "serviceAccountId" | "accessRevision" | "title" | "payload" | "evidence"
>;

export type ReportQueueScope = {
  identityUserId: string;
  authorizedServiceAccountIds: readonly string[];
  accessRevision: number;
};

const queueStorageKey = "report_submission_queue_v1";
const listeners = new Set<() => void>();
const runQueueMutation = createKeyedSerialExecutor();
const queueSyncRequests = createPromiseRegistry<string, ReportQueueItem[]>();

function notifyQueueChanged() {
  listeners.forEach((listener) => listener());
}

async function readQueue(): Promise<ReportQueueItem[]> {
  const raw = await AsyncStorage.getItem(queueStorageKey);
  if (!raw) return [];

  try {
    const items = JSON.parse(raw) as ReportQueueItem[];
    return items.map((item) => ({
      ...item,
      status: item.status === "submitting" ? "queued" : item.status,
      lastErrorPhase: item.lastErrorPhase ?? null,
      diagnosticId: item.diagnosticId ?? null,
      nonRetryable: item.nonRetryable === true,
    }));
  } catch {
    return [];
  }
}

async function writeQueue(items: ReportQueueItem[]) {
  await AsyncStorage.setItem(queueStorageKey, JSON.stringify(items));
  notifyQueueChanged();
}

async function replaceQueueItem(nextItem: ReportQueueItem) {
  await runQueueMutation(queueStorageKey, async () => {
    const items = await readQueue();
    await writeQueue(
      items.map((item) => (item.id === nextItem.id ? nextItem : item)),
    );
  });
}

export function createLocalReportId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return (
    uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export function subscribeReportQueue(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function queueItemVisibleToScope(item: ReportQueueItem, scope?: string | ReportQueueScope) {
  if (!scope) return true;
  if (typeof scope === "string") return item.userId === scope;
  return isQueuedReportVisible(item, scope);
}

export async function listReportQueue(scope?: string | ReportQueueScope) {
  const items = await readQueue();
  return items
    .filter((item) => queueItemVisibleToScope(item, scope))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function enqueueReport(input: ReportQueueInput) {
  return runQueueMutation(queueStorageKey, async () => {
    const items = await readQueue();
    const existing = items.find((item) => item.id === input.id);
    if (existing) return existing;

    const now = new Date().toISOString();
    const item: ReportQueueItem = {
      ...input,
      createdAt: now,
      updatedAt: now,
      status: "queued",
      attempts: 0,
      lastError: null,
      lastErrorPhase: null,
      diagnosticId: null,
      ticketId: null,
      ticketNumber: null,
    };
    await writeQueue([...items, item]);
    return item;
  });
}

async function submitQueuedReport(item: ReportQueueItem, authToken: string) {
  const submitting: ReportQueueItem = {
    ...item,
    status: "submitting",
    attempts: item.attempts + 1,
    updatedAt: new Date().toISOString(),
    lastError: null,
    lastErrorPhase: null,
    diagnosticId: null,
  };
  await replaceQueueItem(submitting);

  try {
    const currentAccess = await readConsistentConsumerAccountSnapshot({
      readIdentity: async () => normalizeConsumerIdentity(await apiRequest<unknown>("/api/mobile/consumer-identity", {}, { authToken, phase: "metadata", timeoutMs: 15_000 }), { id: item.userId }),
      readLinkedAccounts: async () => normalizeLinkedAccounts(await apiRequest<unknown>("/api/mobile/linked-accounts", {}, { authToken, phase: "metadata", timeoutMs: 15_000 }), { id: item.userId }),
    });
    const accessDecision = evaluateQueuedReportAccess(item, {
      identityUserId: currentAccess.identityUserId,
      authorizedServiceAccountIds: currentAccess.authorizedServiceAccountIds,
      accessRevision: currentAccess.accessRevision,
    });
    if (!accessDecision.allowed) {
      const code = accessDecision.code;
      const failed = { ...submitting, status: "failed" as const, nonRetryable: true, lastError: `${code}: This protected report draft no longer matches your current account access. Refresh before creating a new report.`, lastErrorPhase: "metadata" as const };
      await replaceQueueItem(failed);
      return failed;
    }
    const freshItem: ReportQueueItem = accessDecision.legacyUpgraded
      ? { ...submitting, ...accessDecision.scope }
      : submitting;
    if (accessDecision.legacyUpgraded) await replaceQueueItem(freshItem);
    const { draftId, uploads } = await createEvidenceUploads(
      freshItem.evidence.length,
      { serviceAccountId: freshItem.serviceAccountId, accessRevision: freshItem.accessRevision },
      authToken,
    );
    await mapWithConcurrency(uploads, 2, async (upload, index) => {
      const photo = freshItem.evidence[index];
      if (!photo) throw new Error("A queued evidence photo is missing.");
      await uploadEvidenceToR2(
        upload.uploadUrl,
        await readEvidencePhoto(photo.uri),
      );
    });
    // Older queued drafts included the retired generic description field.
    // Strip it so retries use only the category/type-specific fields.
    const { description: _legacyDescription, ...payload } =
      item.payload as typeof item.payload & { description?: unknown };
    const ticket = await submitComplaint(
      {
        ...payload,
        serviceAccountId: freshItem.serviceAccountId,
        accessRevision: freshItem.accessRevision,
        idempotencyKey: item.idempotencyKey,
        draftIds: [draftId],
        imageKeys: uploads.map((upload) => upload.key),
      },
      authToken,
    );
    const submitted: ReportQueueItem = {
      ...freshItem,
      status: "submitted",
      updatedAt: new Date().toISOString(),
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
    };

    // The ticket is now authoritative on the server.
    //
    // Invalidate the report-list cache BEFORE removing the local queue item.
    // Removing the queue item broadcasts a queue change to mounted report
    // surfaces, so the cache must already be invalidated when they react.
    await clearReportListCache(item.userId);

    // Immediately tell mounted report surfaces to revalidate against the
    // authoritative complaint API instead of waiting for focus/resume/cache expiry.
    requestReportRevalidation(item.userId);

    // The authoritative copy now exists in tickets; remove the local draft so it
    // moves into the normal report list instead of appearing twice.
    await runQueueMutation(queueStorageKey, async () => {
      await writeQueue(
        (await readQueue()).filter((entry) => entry.id !== item.id),
      );
    });

    deleteReportEvidence(item.id);
    return submitted;
  } catch (error) {
    const accessFailure = error instanceof ApiRequestError && ["ACCOUNT_NOT_ACCESSIBLE", "STALE_ACCESS_REVISION"].includes(error.code ?? "");
    const retryable = !accessFailure && (!(error instanceof ApiRequestError) || error.retryable);
    const lastError =
      error instanceof ApiRequestError &&
      error.status != null &&
      error.status >= 500
        ? requestPhaseFailureMessage(error.phase, "network")
        : error instanceof Error
          ? error.message
          : "Report submission failed.";
    const failed: ReportQueueItem = {
      ...submitting,
      status: retryable ? "queued" : "failed",
      nonRetryable: accessFailure,
      updatedAt: new Date().toISOString(),
      lastError,
      lastErrorPhase: error instanceof ApiRequestError ? error.phase : null,
      diagnosticId:
        error instanceof ApiRequestError ? (error.requestId ?? null) : null,
    };
    await replaceQueueItem(failed);
    return failed;
  }
}

export async function syncReportQueue(scope: string | ReportQueueScope) {
  const identityUserId = typeof scope === "string" ? scope : scope.identityUserId;
  return queueSyncRequests.run(identityUserId, async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      return listReportQueue(scope);
    }

    const authToken = await getAuthToken();
    if (!authToken) return listReportQueue(scope);

    const items = await listReportQueue(scope);
    const results: ReportQueueItem[] = [];
    for (const item of items.reverse()) {
      results.push(
        item.status === "queued"
          ? await submitQueuedReport(item, authToken)
          : item,
      );
    }
    return results;
  });
}

export async function retryQueuedReport(id: string) {
  await runQueueMutation(queueStorageKey, async () => {
    const items = await readQueue();
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status === "submitting" || item.status === "submitted" || item.nonRetryable) {
      return;
    }
    await writeQueue(
      items.map((entry) =>
        entry.id === id
          ? {
              ...item,
              status: "queued",
              lastError: null,
              lastErrorPhase: null,
              diagnosticId: null,
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  });
}

export async function removeQueuedReport(id: string) {
  let evidenceId: string | null = null;
  await runQueueMutation(queueStorageKey, async () => {
    const items = await readQueue();
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status === "submitting") return;
    if (item.status !== "submitted") evidenceId = item.id;
    await writeQueue(items.filter((entry) => entry.id !== id));
  });
  if (evidenceId) deleteReportEvidence(evidenceId);
}
