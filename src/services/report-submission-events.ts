import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ReportQueueItem } from "@/services/report-queue";
import {
  mergeReportSubmissionCompletions,
  takeReportSubmissionCompletions,
  type ReportSubmissionCompletion,
} from "@/services/report-submission-completion-store";
import { createKeyedSerialExecutor } from "@/utils/async-coordination";

export type ComplaintSubmissionToast = {
  message: string;
  status: "success" | "danger" | "info";
};

const listeners = new Set<(toast: ComplaintSubmissionToast) => void>();
const completionStorageKey = "report_submission_completions_v1";
const runCompletionMutation = createKeyedSerialExecutor();

async function readCompletions(): Promise<ReportSubmissionCompletion[]> {
  const raw = await AsyncStorage.getItem(completionStorageKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ReportSubmissionCompletion[];
  } catch {
    return [];
  }
}

export async function recordReportSubmissionCompletions(
  items: ReportQueueItem[],
) {
  const submitted = items.filter(
    (
      item,
    ): item is ReportQueueItem & {
      ticketId: string;
      ticketNumber: string;
    } =>
      item.status === "submitted" &&
      Boolean(item.ticketId) &&
      Boolean(item.ticketNumber),
  );
  if (submitted.length === 0) return;

  await runCompletionMutation(completionStorageKey, async () => {
    const existing = await readCompletions();
    const incoming = submitted.map((item) => ({
      id: item.id,
      userId: item.userId,
      ticketId: item.ticketId,
      ticketNumber: item.ticketNumber,
      completedAt: new Date().toISOString(),
    }));
    await AsyncStorage.setItem(
      completionStorageKey,
      JSON.stringify(mergeReportSubmissionCompletions(existing, incoming)),
    );
  });
}

export async function consumeReportSubmissionCompletions(userId: string) {
  return runCompletionMutation(completionStorageKey, async () => {
    const items = await readCompletions();
    const { matching, remaining } = takeReportSubmissionCompletions(
      items,
      userId,
    );
    if (remaining.length > 0) {
      await AsyncStorage.setItem(completionStorageKey, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(completionStorageKey);
    }
    return matching;
  });
}

export function emitComplaintSubmissionToast(toast: ComplaintSubmissionToast) {
  listeners.forEach((listener) => listener(toast));
}

export function subscribeComplaintSubmissionToast(
  listener: (toast: ComplaintSubmissionToast) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
