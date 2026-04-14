import type { Session } from "@supabase/supabase-js";

import { useAuthSessionContext } from "@/context/auth-session-context";

export type UseAuthSessionState = {
  readonly session: Session | null;
  readonly isLoading: boolean;
  readonly signOut: () => Promise<void>;
};

export function useAuthSession(): UseAuthSessionState {
  const { session, isLoading, signOut } = useAuthSessionContext();

  return { session, isLoading, signOut };
}
