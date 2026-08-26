import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import {
  apiRequest,
  getAuthToken,
  type AuthSession,
} from "@/services/api";
import { syncReportQueue } from "@/services/report-queue";
import { recordReportSubmissionCompletions } from "@/services/report-submission-events";

const reportSyncTaskName = "aleconnect-report-queue-sync";

if (Platform.OS !== "web") {
  TaskManager.defineTask(reportSyncTaskName, async () => {
    try {
      const authToken = await getAuthToken();
      if (!authToken) return BackgroundTask.BackgroundTaskResult.Success;

      const session = await apiRequest<AuthSession>(
        "/api/auth/get-session",
        {},
        { authToken },
      );
      const access = await apiRequest<{
        identityUserId?: string;
        authorizedServiceAccountIds?: string[];
        accessRevision?: number;
      }>("/api/mobile/consumer-identity", {}, { authToken, phase: "metadata" });
      const results = await syncReportQueue({
        identityUserId: access.identityUserId ?? session.user.id,
        authorizedServiceAccountIds: Array.isArray(access.authorizedServiceAccountIds) && access.authorizedServiceAccountIds.length ? access.authorizedServiceAccountIds : [session.user.id],
        accessRevision: Number.isSafeInteger(access.accessRevision) ? Number(access.accessRevision) : 0,
      });
      await recordReportSubmissionCompletions(results);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function ensureReportBackgroundSyncRegistered() {
  if (Platform.OS === "web") return;
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(reportSyncTaskName)) return;

  await BackgroundTask.registerTaskAsync(reportSyncTaskName, {
    minimumInterval: 15,
  });
}
