import type { PropsWithChildren } from "react";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ConsumerAccountContext as ConsumerAccountState } from "@/features/accounts/contract";
import { fetchConsumerAccountContext } from "@/services/consumer-identity";
import { useAuthSession } from "@/hooks/use-auth-session";

import { resolveSelectedServiceAccount } from "@/features/accounts/selection";
export type ConsumerAccountContextValue = {
  readonly selectedServiceAccountId: string | null;
  readonly selectServiceAccount: (id: string) => boolean;
  readonly accountContext: ConsumerAccountState | null;
  readonly isLoading: boolean;
  readonly refreshConsumerAccount: () => Promise<ConsumerAccountState | null>;
  readonly clearConsumerAccount: () => void;
};

const ConsumerAccountContext =
  createContext<ConsumerAccountContextValue | null>(null);

export function ConsumerAccountProvider({ children }: PropsWithChildren) {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const [accountContext, setAccountContext] = useState<{
    principalId: string;
    value: ConsumerAccountState;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const visibleContext =
    session?.user.id === accountContext?.principalId
      ? (accountContext?.value ?? null)
      : null;
  const selectionKey = JSON.stringify([
    session?.user.id,
    visibleContext?.identityUserId,
    visibleContext?.accessRevision,
  ]);
  const selectedServiceAccountId = resolveSelectedServiceAccount(
    visibleContext,
    selection?.key === selectionKey ? selection.id : null,
  );
  const selectServiceAccount = useCallback(
    (id: string) => {
      if (
        !visibleContext?.authorizedServiceAccountIds.includes(id) ||
        !visibleContext.accounts.some((a) => a.id === id)
      )
        return false;
      setSelection({ key: selectionKey, id });
      return true;
    },
    [visibleContext, selectionKey],
  );
  const generation = useRef(0);
  const cache = useRef<{
    principalId: string;
    value: ConsumerAccountState;
  } | null>(null);

  const refreshConsumerAccount = useCallback(async () => {
    const currentSession = session;
    const principalId = currentSession?.user.id;
    const requestGeneration = generation.current;
    if (!principalId || !currentSession) {
      cache.current = null;
      setAccountContext(null);
      setIsLoading(false);
      return null;
    }

    const cached = cache.current;
    if (cached?.principalId === principalId) {
      setAccountContext(cached);
    }
    setIsLoading(true);
    try {
      const next = await fetchConsumerAccountContext(currentSession.user);
      if (
        generation.current !== requestGeneration ||
        session?.user.id !== principalId
      ) {
        return null;
      }
      cache.current = { principalId, value: next };
      setAccountContext({ principalId, value: next });
      return next;
    } finally {
      if (
        generation.current === requestGeneration &&
        session?.user.id === principalId
      ) {
        setIsLoading(false);
      }
    }
  }, [session]);

  const clearConsumerAccount = useCallback(() => {
    generation.current += 1;
    setSelection(null);
    cache.current = null;
    setAccountContext(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    generation.current += 1;
    if (!session?.user.id) {
      cache.current = null;
      setAccountContext(null);
      setIsLoading(false);
      return;
    }
    void refreshConsumerAccount().catch(() => {
      if (session?.user.id) setIsLoading(false);
    });
  }, [refreshConsumerAccount, session?.user.id]);

  const value = useMemo(
    () => ({
      selectedServiceAccountId,
      selectServiceAccount,
      // Bind snapshots to the login principal; canonical identity can differ in legacy mode.
      accountContext:
        session?.user.id === accountContext?.principalId
          ? (accountContext?.value ?? null)
          : null,
      isLoading: isSessionLoading || isLoading,
      refreshConsumerAccount,
      clearConsumerAccount,
    }),
    [
      accountContext,
      selectedServiceAccountId,
      selectServiceAccount,
      clearConsumerAccount,
      isLoading,
      isSessionLoading,
      refreshConsumerAccount,
      session,
    ],
  );

  return createElement(ConsumerAccountContext.Provider, { value }, children);
}

export function useConsumerAccountContext(): ConsumerAccountContextValue {
  const value = useContext(ConsumerAccountContext);
  if (!value) {
    throw new Error(
      "useConsumerAccountContext must be used within ConsumerAccountProvider",
    );
  }
  return value;
}
