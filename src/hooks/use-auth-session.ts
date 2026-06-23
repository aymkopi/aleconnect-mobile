import { useAuthSessionContext } from "@/context/auth-session-context";
import type { AuthSession } from "@/services/api";

export type UseAuthSessionState = {
  readonly session: AuthSession | null;
  readonly isLoading: boolean;
  readonly refreshSession: () => Promise<AuthSession | null>;
  readonly signOut: () => Promise<void>;
};

export function useAuthSession(): UseAuthSessionState {
  const { session, isLoading, refreshSession, signOut } =
    useAuthSessionContext();

  return { session, isLoading, refreshSession, signOut };
}
