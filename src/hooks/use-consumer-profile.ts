import { useCallback, useEffect, useState } from "react";

import {
  fetchCurrentConsumerProfileView,
} from "@/services/profile";
import type { ConsumerProfileView } from "@/models/consumer-profile-view";

export type UseConsumerProfileState = {
  readonly profile: ConsumerProfileView | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly reload: () => Promise<void>;
};

export function useConsumerProfile(): UseConsumerProfileState {
  const [profile, setProfile] = useState<ConsumerProfileView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextProfile = await fetchCurrentConsumerProfileView();
      setProfile(nextProfile);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, isLoading, error, reload };
}