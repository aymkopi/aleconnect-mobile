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

export type ConsumerAccountContextValue = {
  readonly accountContext: ConsumerAccountState | null;
  readonly isLoading: boolean;
  readonly refreshConsumerAccount: () => Promise<ConsumerAccountState | null>;
  readonly clearConsumerAccount: () => void;
};

const ConsumerAccountContext = createContext<ConsumerAccountContextValue | null>(null);

export function ConsumerAccountProvider({ children }: PropsWithChildren) {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const [accountContext, setAccountContext] = useState<ConsumerAccountState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const generation = useRef(0);
  const cache = useRef<{ principalId: string; value: ConsumerAccountState } | null>(null);

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
      setAccountContext(cached.value);
    }
    setIsLoading(true);
    try {
      const next = await fetchConsumerAccountContext(currentSession.user);
      if (generation.current !== requestGeneration || session?.user.id !== principalId) {
        return null;
      }
      cache.current = { principalId, value: next };
      setAccountContext(next);
      return next;
    } finally {
      if (generation.current === requestGeneration && session?.user.id === principalId) {
        setIsLoading(false);
      }
    }
  }, [session]);

  const clearConsumerAccount = useCallback(() => {
    generation.current += 1;
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
      // Never leave a private account snapshot readable after sign-out or
      // session revocation, even before React processes the clearing effect.
      accountContext: session ? accountContext : null,
      isLoading: isSessionLoading || isLoading,
      refreshConsumerAccount,
      clearConsumerAccount,
    }),
    [accountContext, clearConsumerAccount, isLoading, isSessionLoading, refreshConsumerAccount, session],
  );

  return createElement(ConsumerAccountContext.Provider, { value }, children);
}

export function useConsumerAccountContext(): ConsumerAccountContextValue {
  const value = useContext(ConsumerAccountContext);
  if (!value) {
    throw new Error("useConsumerAccountContext must be used within ConsumerAccountProvider");
  }
  return value;
}
