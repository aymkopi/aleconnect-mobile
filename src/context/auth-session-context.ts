import type { PropsWithChildren } from "react";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  apiRequest,
  clearAuthToken,
  getAuthToken,
  type AuthSession,
} from "@/services/api";

export type AuthSessionContextValue = {
  readonly session: AuthSession | null;
  readonly isLoading: boolean;
  readonly refreshSession: () => Promise<AuthSession | null>;
  readonly signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return null;
    }

    try {
      const nextSession = await apiRequest<AuthSession>(
        "/api/auth/get-session",
      );
      setSession(nextSession);
      return nextSession;
    } catch {
      await clearAuthToken();
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest<{ success: boolean }>("/api/auth/sign-out", {
      method: "POST",
    }).catch(() => null);
    await clearAuthToken();
    setSession(null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

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
