import NetInfo from "@react-native-community/netinfo";
import { syncConsumerUpdateQueue } from "@/services/consumer-update-queue";
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
import { isQueuedReportVisible } from "@/services/report-queue-access";

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
  announceSubmission: (id: string) => Promise<void>;
  retry: (id: string) => Promise<ReportQueueItem[]>;
  remove: (id: string) => Promise<void>;
};

const ReportQueueContext = createContext<ReportQueueContextValue | null>(null);

export function ReportQueueProvider({ children, syncEnabled = true }: PropsWithChildren<{ syncEnabled?: boolean }>) {
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
  const latestScope = useRef(queueScope);
  latestScope.current = queueScope;
  const scopeCurrent = useCallback(() => !!queueScope && !!latestScope.current &&
    latestScope.current.identityUserId === queueScope.identityUserId &&
    latestScope.current.accessRevision === queueScope.accessRevision, [queueScope]);
  const [items, setItems] = useState<ReportQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const activeSync = useRef<Promise<ReportQueueItem[]> | null>(null);

  const refresh = useCallback(async () => {
    const next = queueScope ? await listReportQueue(queueScope) : [];
    if (!queueScope || scopeCurrent()) setItems(next);
  }, [queueScope, scopeCurrent]);

  const sync = useCallback(async (announce = true) => {
    if (!syncEnabled || !queueScope) return [];
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
        if (announce && scopeCurrent()) {
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
  }, [queueScope, refresh, syncEnabled, scopeCurrent]);

  useEffect(() => {
    void refresh();
    if (userId) { void sync(); if (syncEnabled) void syncConsumerUpdateQueue().catch(() => {}); }
  }, [queueScope, refresh, sync, userId, syncEnabled]);

  useEffect(() => {
    if (!syncEnabled || !userId) return;
    void ensureReportBackgroundSyncRegistered();
    void consumeReportSubmissionCompletions(userId).then((completions) => {
      if (!scopeCurrent()) return;
      completions.forEach((completion) => {
        emitComplaintSubmissionToast({
          status: "success",
          message: `Report submitted: ${completion.ticketNumber}`,
        });
      });
    });
  }, [syncEnabled, userId, scopeCurrent]);

  useEffect(() => subscribeReportQueue(() => void refresh()), [refresh]);

  useEffect(() => {
    if (!syncEnabled || !userId) return;
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) { void sync(); void syncConsumerUpdateQueue().catch(() => {}); }
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") { void sync(); void syncConsumerUpdateQueue().catch(() => {}); }
      },
    );
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [sync, syncEnabled, userId]);

  const visibleItems = useMemo(() => queueScope ? items.filter(item =>
    isQueuedReportVisible(item, queueScope) &&
    queueScope.authorizedServiceAccountIds.includes(item.serviceAccountId ?? item.userId)) : [], [items, queueScope]);

  const value = useMemo<ReportQueueContextValue>(
    () => ({
      items: visibleItems,
      pendingCount: visibleItems.filter((item) => item.status !== "submitted").length,
      isSyncing,
      refresh,
      sync,
      announceSubmission: async (id) => {
        if (!queueScope || !scopeCurrent()) return;
        const item = (await listReportQueue(queueScope)).find(v => v.id === id);
        if (!item || !scopeCurrent() ||
          !queueScope.authorizedServiceAccountIds.includes(item.serviceAccountId ?? item.userId)) return;
        emitComplaintSubmissionToast(item.status === "submitted"
          ? { status: "success", message: "Report submitted: " + item.ticketNumber }
          : { status: "info", message: "Report saved to your queue. Open Reports to check or retry." });
      },
      retry: async (id) => {
        if (!syncEnabled) return [];
        await retryQueuedReport(id);
        return sync();
      },
      remove: async (id) => {
        if (!syncEnabled) return;
        await removeQueuedReport(id);
        await refresh();
      },
    }),
    [isSyncing, visibleItems, refresh, sync, syncEnabled, queueScope, scopeCurrent],
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
