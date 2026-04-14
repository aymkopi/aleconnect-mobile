import type { Session } from "@supabase/supabase-js";
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

import { supabase } from "@/services/supabase";

export type AuthSessionContextValue = {
  readonly session: Session | null;
  readonly isLoading: boolean;
  readonly signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, signOut }),
    [session, isLoading, signOut],
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
