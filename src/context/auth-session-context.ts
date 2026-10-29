import type { PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearConsumerAccountCache } from "@/services/consumer-account-cache";
import { clearConsumerProfileCaches } from "@/hooks/use-consumer-profile";
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

import {
  ApiRequestError,
  apiRequest,
  clearAuthToken,
  getAuthToken,
  getAuthTokenRevision,
  subscribeAuthInvalidated,
  type AuthSession,
} from "@/services/api";

export type AuthSessionContextValue = {
  readonly session: AuthSession | null;
  readonly isLoading: boolean;
  readonly refreshSession: (options?: {
    forceNetwork?: boolean;
  }) => Promise<AuthSession | null>;
  readonly signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const authSessionCacheKey = "auth_session_cache_v1";
const authSessionCacheTtlMs = 30 * 24 * 60 * 60 * 1000;

type AuthSessionCache = {
  fetchedAt: number;
  value: AuthSession;
};

async function readCachedSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(authSessionCacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSessionCache;
    const expiresAt = new Date(parsed.value?.session?.expiresAt).getTime();
    if (!Number.isFinite(parsed.fetchedAt) || parsed.fetchedAt > Date.now() ||
      Date.now() - parsed.fetchedAt > authSessionCacheTtlMs || !Number.isFinite(expiresAt) || expiresAt <= Date.now() ||
      !parsed.value?.user?.id || parsed.value.user.role !== "consumer" ||
      parsed.value.session.userId !== parsed.value.user.id) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

async function writeCachedSession(value: AuthSession): Promise<void> {
  await AsyncStorage.setItem(
    authSessionCacheKey,
    JSON.stringify({ fetchedAt: Date.now(), value } satisfies AuthSessionCache),
  );
}

async function clearCachedSession(): Promise<void> {
  const privateReads = Promise.allSettled([clearConsumerAccountCache(), clearConsumerProfileCaches()]);
  await AsyncStorage.removeItem(authSessionCacheKey);
  await privateReads;
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authGeneration = useRef(0);

  const refreshSession = useCallback(
    async (options?: { forceNetwork?: boolean }) => {
      const generation = authGeneration.current;
      const tokenRevision = getAuthTokenRevision();
      const token = await getAuthToken();
      if (
        generation !== authGeneration.current ||
        tokenRevision !== getAuthTokenRevision()
      )
        return null;
      if (!token) {
        await clearCachedSession();
        if (
          generation !== authGeneration.current ||
          tokenRevision !== getAuthTokenRevision()
        )
          return null;
        setSession(null);
        setIsLoading(false);
        return null;
      }

      const cachedSession = await readCachedSession();
      if (
        cachedSession &&
        !options?.forceNetwork &&
        generation === authGeneration.current &&
        tokenRevision === getAuthTokenRevision()
      ) {
        setSession(cachedSession);
        setIsLoading(false);
      }

      try {
        const nextSession = await apiRequest<AuthSession>(
          "/api/auth/get-session",
          {},
          { authToken: token },
        );
        if (
          generation !== authGeneration.current ||
          tokenRevision !== getAuthTokenRevision()
        )
          return null;
        setSession(nextSession);
        await writeCachedSession(nextSession);
        return nextSession;
      } catch (error) {
        if (
          generation !== authGeneration.current ||
          tokenRevision !== getAuthTokenRevision()
        )
          return null;
        if (error instanceof ApiRequestError && error.status === 401) {
          await clearAuthToken();
          await clearCachedSession();
          setSession(null);
          return null;
        }

        return options?.forceNetwork ? null : cachedSession;
      } finally {
        if (
          generation === authGeneration.current &&
          tokenRevision === getAuthTokenRevision()
        )
          setIsLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    authGeneration.current += 1;
    const tokenRevision = getAuthTokenRevision();
    const token = await getAuthToken();
    if (tokenRevision !== getAuthTokenRevision()) return;
    if (token) {
      await apiRequest<{ success: boolean }>(
        "/api/auth/sign-out",
        { method: "POST" },
        { authToken: token },
      ).catch(() => null);
    }
    if (tokenRevision !== getAuthTokenRevision()) return;
    await clearAuthToken();
    if (tokenRevision + 1 !== getAuthTokenRevision()) return;
    await clearCachedSession();
    if (tokenRevision + 1 !== getAuthTokenRevision()) return;
    setSession(null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    return subscribeAuthInvalidated(() => {
      // Any authenticated endpoint can discover that this device was replaced.
      // Clear local state immediately so protected screens fall back to sign-in.
      authGeneration.current += 1;
      void clearCachedSession();
      setSession(null);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, refreshSession, signOut }),
    [session, isLoading, refreshSession, signOut],
  );

  return createElement(AuthSessionContext.Provider, { value }, children);
}

export function useAuthSessionContext(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);

  if (!value) {
    throw new Error(
      "useAuthSessionContext must be used within AuthSessionProvider",
    );
  }

  return value;
}
