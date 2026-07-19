import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import {
  createEvidenceUploads,
  clearReportListCache,
  submitComplaint,
  uploadEvidenceToR2,
  type SubmitComplaintInput,
} from "@/services/reports";
import {
  deleteReportEvidence,
  readEvidencePhoto,
  type PreparedEvidencePhoto,
} from "@/utils/evidence-image-processing";
import { ApiRequestError } from "@/services/api";

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
let syncPromise: Promise<ReportQueueItem[]> | null = null;

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
  const items = await readQueue();
  await writeQueue(
    items.map((item) => (item.id === nextItem.id ? nextItem : item)),
  );
}

export function createLocalReportId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
    ticketId: null,
    ticketNumber: null,
  };
  await writeQueue([...items, item]);
  return item;
}

async function submitQueuedReport(item: ReportQueueItem) {
  const submitting: ReportQueueItem = {
    ...item,
    status: "submitting",
    attempts: item.attempts + 1,
    updatedAt: new Date().toISOString(),
    lastError: null,
  };
  await replaceQueueItem(submitting);

  try {
    const { draftId, uploads } = await createEvidenceUploads(
      item.evidence.length,
    );
    await Promise.all(
      uploads.map(async (upload, index) => {
        const photo = item.evidence[index];
        if (!photo) throw new Error("A queued evidence photo is missing.");
        await uploadEvidenceToR2(
          upload.uploadUrl,
          await readEvidencePhoto(photo.uri),
        );
      }),
    );
    const ticket = await submitComplaint({
      ...item.payload,
      idempotencyKey: item.idempotencyKey,
      draftIds: [draftId],
      imageKeys: uploads.map((upload) => upload.key),
    });
    const submitted: ReportQueueItem = {
      ...submitting,
      status: "submitted",
      updatedAt: new Date().toISOString(),
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
    };
    await replaceQueueItem(submitted);
    await clearReportListCache(item.userId);
    deleteReportEvidence(item.id);
    return submitted;
  } catch (error) {
    const retryable =
      !(error instanceof ApiRequestError) ||
      error.status == null ||
      error.status >= 500;
    const failed: ReportQueueItem = {
      ...submitting,
      status: retryable ? "queued" : "failed",
      updatedAt: new Date().toISOString(),
      lastError:
        error instanceof Error ? error.message : "Report submission failed.",
    };
    await replaceQueueItem(failed);
    return failed;
  }
}

export async function syncReportQueue(userId: string) {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      return listReportQueue(userId);
    }

    const items = await listReportQueue(userId);
    const results: ReportQueueItem[] = [];
    for (const item of items.reverse()) {
      results.push(
        item.status === "queued" ? await submitQueuedReport(item) : item,
      );
    }
    return results;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

export async function retryQueuedReport(id: string) {
  const items = await readQueue();
  const item = items.find((entry) => entry.id === id);
  if (!item || item.status === "submitting" || item.status === "submitted") {
    return;
  }
  await replaceQueueItem({
    ...item,
    status: "queued",
    lastError: null,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeQueuedReport(id: string) {
  const items = await readQueue();
  const item = items.find((entry) => entry.id === id);
  if (!item || item.status === "submitting") return;
  if (item.status !== "submitted") deleteReportEvidence(item.id);
  await writeQueue(items.filter((entry) => entry.id !== id));
}
