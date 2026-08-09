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
  const userId = session?.user.id;
  const [items, setItems] = useState<ReportQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const activeSync = useRef<Promise<ReportQueueItem[]> | null>(null);

  const refresh = useCallback(async () => {
    setItems(userId ? await listReportQueue(userId) : []);
  }, [userId]);

  const sync = useCallback(async (announce = true) => {
    if (!userId) return [];
    if (activeSync.current) return activeSync.current;

    const before = await listReportQueue(userId);
    const submittedBefore = new Set(
      before
        .filter((item) => item.status === "submitted")
        .map((item) => item.id),
    );
    setIsSyncing(true);
    activeSync.current = syncReportQueue(userId)
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
  }, [refresh, userId]);

  useEffect(() => {
    void refresh();
    if (userId) void sync();
  }, [refresh, sync, userId]);

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
