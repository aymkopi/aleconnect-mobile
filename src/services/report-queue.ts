import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { ApiRequestError, getAuthToken } from "@/services/api";
import { requestReportRevalidation } from "@/services/report-sync-events";
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
  "id" | "idempotencyKey" | "userId" | "title" | "payload" | "evidence"
>;

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

export async function listReportQueue(userId?: string) {
  const items = await readQueue();
  return items
    .filter((item) => !userId || item.userId === userId)
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
    const { draftId, uploads } = await createEvidenceUploads(
      item.evidence.length,
      authToken,
    );
    await mapWithConcurrency(uploads, 2, async (upload, index) => {
      const photo = item.evidence[index];
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
        idempotencyKey: item.idempotencyKey,
        draftIds: [draftId],
        imageKeys: uploads.map((upload) => upload.key),
      },
      authToken,
    );
    const submitted: ReportQueueItem = {
      ...submitting,
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
    const retryable = !(error instanceof ApiRequestError) || error.retryable;
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

export async function syncReportQueue(userId: string) {
  return queueSyncRequests.run(userId, async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      return listReportQueue(userId);
    }

    const authToken = await getAuthToken();
    if (!authToken) return listReportQueue(userId);

    const items = await listReportQueue(userId);
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
    if (!item || item.status === "submitting" || item.status === "submitted") {
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
