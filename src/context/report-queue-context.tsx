import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { ensureReportBackgroundSyncRegistered } from "@/services/report-background-sync";
import {
  consumeReportSubmissionCompletions,
  emitComplaintSubmissionToast,
} from "@/services/report-submission-events";
import {
  listReportQueue,
  removeQueuedReport,
  retryQueuedReport,
  subscribeReportQueue,
  syncReportQueue,
  type ReportQueueItem,
} from "@/services/report-queue";

type ReportQueueContextValue = {
  items: ReportQueueItem[];
  pendingCount: number;
  isSyncing: boolean;
  refresh: () => Promise<void>;
  sync: (announce?: boolean) => Promise<ReportQueueItem[]>;
  retry: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const ReportQueueContext = createContext<ReportQueueContextValue | null>(null);

export function ReportQueueProvider({ children }: PropsWithChildren) {
  const { session } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const userId = session?.user.id;
  const queueScope = useMemo(() => {
    if (accountContext) return {
      identityUserId: accountContext.identityUserId,
      authorizedServiceAccountIds: accountContext.authorizedServiceAccountIds,
      accessRevision: accountContext.accessRevision,
    };
    return userId ? { identityUserId: userId, authorizedServiceAccountIds: [userId], accessRevision: 0 } : null;
  }, [accountContext, userId]);
  const [items, setItems] = useState<ReportQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const activeSync = useRef<Promise<ReportQueueItem[]> | null>(null);

  const refresh = useCallback(async () => {
    setItems(queueScope ? await listReportQueue(queueScope) : []);
  }, [queueScope]);

  const sync = useCallback(async (announce = true) => {
    if (!queueScope) return [];
    if (activeSync.current) return activeSync.current;

    const before = await listReportQueue(queueScope);
    const submittedBefore = new Set(
      before
        .filter((item) => item.status === "submitted")
        .map((item) => item.id),
    );
    setIsSyncing(true);
    activeSync.current = syncReportQueue(queueScope)
      .then(async (results) => {
        await refresh();
        if (announce) {
          results
            .filter(
              (item) =>
                item.status === "submitted" && !submittedBefore.has(item.id),
            )
            .forEach((item) => {
              emitComplaintSubmissionToast({
                status: "success",
                message: `Report submitted: ${item.ticketNumber}`,
              });
            });
        }
        return results;
      })
      .finally(() => {
        activeSync.current = null;
        setIsSyncing(false);
      });
    return activeSync.current;
  }, [queueScope, refresh]);

  useEffect(() => {
    void refresh();
    if (userId) void sync();
  }, [queueScope, refresh, sync, userId]);

  useEffect(() => {
    if (!userId) return;
    void ensureReportBackgroundSyncRegistered();
    void consumeReportSubmissionCompletions(userId).then((completions) => {
      completions.forEach((completion) => {
        emitComplaintSubmissionToast({
          status: "success",
          message: `Report submitted: ${completion.ticketNumber}`,
        });
      });
    });
  }, [userId]);

  useEffect(() => subscribeReportQueue(() => void refresh()), [refresh]);

  useEffect(() => {
    if (!userId) return;
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void sync();
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void sync();
      },
    );
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [sync, userId]);

  const value = useMemo<ReportQueueContextValue>(
    () => ({
      items,
      pendingCount: items.filter((item) => item.status !== "submitted").length,
      isSyncing,
      refresh,
      sync,
      retry: async (id) => {
        await retryQueuedReport(id);
        await sync();
      },
      remove: async (id) => {
        await removeQueuedReport(id);
        await refresh();
      },
    }),
    [isSyncing, items, refresh, sync],
  );

  return (
    <ReportQueueContext.Provider value={value}>
      {children}
    </ReportQueueContext.Provider>
  );
}

export function useReportQueue() {
  const value = useContext(ReportQueueContext);
  if (!value) {
    throw new Error("useReportQueue must be used within ReportQueueProvider");
  }
  return value;
}
