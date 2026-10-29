import type { PropsWithChildren } from "react";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ConsumerAccountContext as ConsumerAccountState } from "@/features/accounts/contract";
import { resolveSelectedServiceAccount } from "@/features/accounts/selection";
import { useAuthSession } from "@/hooks/use-auth-session";
import { clearConsumerProfileCaches, warmConsumerProfileCache } from "@/hooks/use-consumer-profile";
import { fetchConsumerAccountContext } from "@/services/consumer-identity";
import { clearConsumerAccountCache, isConsumerReadTransportError, readConsumerAccountCache, writeConsumerAccountCache } from "@/services/consumer-account-cache";
import { fetchComplaintMeta } from "@/services/reports";

export type ConsumerAccountContextValue = {
  readonly selectedServiceAccountId: string | null;
  readonly selectServiceAccount: (id: string) => boolean;
  readonly accountContext: ConsumerAccountState | null;
  readonly isLoading: boolean;
  readonly isCached: boolean;
  readonly isStale: boolean;
  readonly refreshConsumerAccount: (options?: { invalidate?: boolean }) => Promise<ConsumerAccountState | null>;
  readonly clearConsumerAccount: () => void;
};
type Snapshot = { principalId: string; sessionKey: string; value: ConsumerAccountState; isCached: boolean; isStale: boolean };
const ConsumerAccountContext = createContext<ConsumerAccountContextValue | null>(null);

export function ConsumerAccountProvider({ children }: PropsWithChildren) {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const principalId = session?.user.id ?? null;
  const authKey = principalId ? JSON.stringify([principalId, session?.session?.id]) : null;
  const sessionKey = JSON.stringify([principalId, session?.session?.id, session?.session?.expiresAt, session?.user.identityUserId, session?.user.accessRevision]);
  const activeSession = useRef({ session, sessionKey });
  activeSession.current = { session, sessionKey };
  const generation = useRef(0), cache = useRef<Snapshot | null>(null);
  const previousSession = useRef<string | null>(null);
  const request = useRef<{ key: string; promise: Promise<ConsumerAccountState | null> } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState<{ key: string; id: string } | null>(null);
  const visible = snapshot?.sessionKey === sessionKey ? snapshot : null;
  const visibleContext = visible?.value ?? null;
  const selectionKey = JSON.stringify([principalId, visibleContext?.identityUserId, visibleContext?.accessRevision]);
  const selectedServiceAccountId = resolveSelectedServiceAccount(visibleContext, selection?.key === selectionKey ? selection.id : null);
  const selectServiceAccount = useCallback((id: string) => {
    if (!visibleContext?.authorizedServiceAccountIds.includes(id) || !visibleContext.accounts.some(account => account.id === id)) return false;
    setSelection({ key: selectionKey, id }); return true;
  }, [visibleContext, selectionKey]);

  const refreshConsumerAccount = useCallback((options?: { invalidate?: boolean }): Promise<ConsumerAccountState | null> => {
    if (options?.invalidate) {
      generation.current += 1; request.current = null; cache.current = null;
      setSnapshot(null); setSelection(null);
      void clearConsumerAccountCache(principalId ?? undefined).catch(() => {});
    }
    if (request.current?.key === sessionKey) return request.current.promise;
    const currentSession = activeSession.current.session;
    if (!principalId || !currentSession) { setIsLoading(false); return Promise.resolve(null); }
    const requestGeneration = generation.current;
    const current = () => generation.current === requestGeneration && activeSession.current.sessionKey === sessionKey;
    const promise = (async () => {
      let retained = cache.current?.sessionKey === sessionKey ? cache.current : null;
      setIsLoading(!retained);
      try {
        if (!retained && !options?.invalidate) {
          const stored = await readConsumerAccountCache(principalId).catch(() => null);
          if (!current()) return null;
          const matches = stored &&
            (!currentSession.user.identityUserId || stored.identityUserId === currentSession.user.identityUserId) &&
            (currentSession.user.accessRevision === undefined || stored.accessRevision >= currentSession.user.accessRevision);
          if (stored && !matches) await clearConsumerAccountCache(principalId).catch(() => {});
          if (matches && current()) {
            retained = { principalId, sessionKey, value: stored, isCached: true, isStale: true };
            cache.current = retained; setSnapshot(retained); setIsLoading(false);
          }
        }
        const next = await fetchConsumerAccountContext(currentSession.user);
        if (!current()) return null;
        await writeConsumerAccountCache(principalId, next).catch(error => {
          if ((error as { code?: string })?.code === "INVALID_ACCOUNT_SNAPSHOT") throw error;
        });
        if (!current()) return null;
        const fresh = { principalId, sessionKey, value: next, isCached: false, isStale: false };
        cache.current = fresh; setSnapshot(fresh);
        const warmCurrent = () => current() && cache.current === fresh;
        // Two profile reads at a time use the same scoped caches as New report.
        void (async () => {
          await fetchComplaintMeta().catch(() => {});
          let index = 0;
          await Promise.all([0, 1].map(async () => {
            while (warmCurrent() && index < next.accounts.length) {
              const account = next.accounts[index++];
              await warmConsumerProfileCache(principalId, next.identityUserId, { serviceAccountId: account.id, accessRevision: next.accessRevision }, warmCurrent).catch(() => {});
            }
          }));
        })();
        return next;
      } catch (error) {
        if (!current()) return null;
        if (retained && isConsumerReadTransportError(error)) {
          const stale = { ...retained, isStale: true }; cache.current = stale; setSnapshot(stale); return retained.value;
        }
        cache.current = null; setSnapshot(null); setSelection(null);
        if (!isConsumerReadTransportError(error)) await Promise.allSettled([clearConsumerAccountCache(principalId), clearConsumerProfileCaches()]);
        throw error;
      } finally {
        if (current()) { setIsLoading(false); request.current = null; }
      }
    })();
    request.current = { key: sessionKey, promise };
    return promise;
  }, [principalId, sessionKey]);

  const clearConsumerAccount = useCallback(() => {
    generation.current += 1; request.current = null; cache.current = null;
    setSelection(null); setSnapshot(null); setIsLoading(false);
    void clearConsumerAccountCache(activeSession.current.session?.user.id).catch(() => {});
  }, []);
  useEffect(() => {
    generation.current += 1; request.current = null;
    const changedSession = previousSession.current !== null && previousSession.current !== authKey;
    previousSession.current = authKey;
    if (!principalId) {
      cache.current = null; setSnapshot(null); setIsLoading(false);
      if (!isSessionLoading) void clearConsumerAccountCache().catch(() => {});
      return;
    }
    void refreshConsumerAccount(changedSession ? { invalidate: true } : undefined).catch(() => {});
    return () => { generation.current += 1; };
  }, [principalId, authKey, sessionKey, refreshConsumerAccount, isSessionLoading]);

  const value = useMemo(() => ({ selectedServiceAccountId, selectServiceAccount, accountContext: visibleContext,
    isLoading: isSessionLoading || isLoading, isCached: visible?.isCached ?? false, isStale: visible?.isStale ?? false,
    refreshConsumerAccount, clearConsumerAccount }), [selectedServiceAccountId, selectServiceAccount, visibleContext, isSessionLoading, isLoading, visible, refreshConsumerAccount, clearConsumerAccount]);
  return createElement(ConsumerAccountContext.Provider, { value }, children);
}

export function useConsumerAccountContext(): ConsumerAccountContextValue {
  const value = useContext(ConsumerAccountContext);
  if (!value) throw new Error("useConsumerAccountContext must be used within ConsumerAccountProvider");
  return value;
}
