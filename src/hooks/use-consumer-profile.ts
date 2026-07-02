import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { useAuthSession } from "@/hooks/use-auth-session";
import {
  fromConsumerProfileViewCachePayload,
  toConsumerProfileViewCachePayload,
  type ConsumerProfileView,
  type ConsumerProfileViewCachePayload,
} from "@/models/consumer-profile-view";
import { fetchCurrentConsumerProfileView } from "@/services/profile";

const profileCacheTtlMs = 24 * 60 * 60 * 1000;
const profileCachePayloadPrefix = "profile_cache_payload_v1";
const profileCacheFetchedAtPrefix = "profile_cache_fetched_at_v1";
const profileMemoryCache = new Map<
  string,
  { fetchedAt: number; value: ConsumerProfileView | null }
>();
const profileRequests = new Map<
  string,
  Promise<ConsumerProfileView | null>
>();

function buildPayloadKey(userId: string): string {
  return `${profileCachePayloadPrefix}:${userId}`;
}

function buildFetchedAtKey(userId: string): string {
  return `${profileCacheFetchedAtPrefix}:${userId}`;
}

function parseCachedProfile(payloadText: string): ConsumerProfileView | null {
  try {
    const parsed = JSON.parse(payloadText) as ConsumerProfileViewCachePayload;
    return fromConsumerProfileViewCachePayload(parsed);
  } catch {
    return null;
  }
}

export type UseConsumerProfileState = {
  readonly profile: ConsumerProfileView | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly reload: (options?: { forceNetwork?: boolean }) => Promise<void>;
  readonly setAvatarUrl: (avatarUrl: string | null) => Promise<void>;
};

export function useConsumerProfile(): UseConsumerProfileState {
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<ConsumerProfileView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshFromNetwork = useCallback(
    async (userId: string, keepCachedVisible: boolean) => {
      if (!keepCachedVisible) {
        setIsLoading(true);
      }

      try {
        const activeRequest =
          profileRequests.get(userId) ?? fetchCurrentConsumerProfileView();
        profileRequests.set(userId, activeRequest);

        const nextProfile = await activeRequest.finally(() => {
          profileRequests.delete(userId);
        });

        profileMemoryCache.set(userId, {
          fetchedAt: Date.now(),
          value: nextProfile,
        });
        setProfile(nextProfile);
        setError(null);
        setIsLoading(false);

        const payloadKey = buildPayloadKey(userId);
        const fetchedAtKey = buildFetchedAtKey(userId);

        if (!nextProfile) {
          await AsyncStorage.multiRemove([payloadKey, fetchedAtKey]);
          return;
        }

        const payload = JSON.stringify(
          toConsumerProfileViewCachePayload(nextProfile),
        );

        await AsyncStorage.multiSet([
          [payloadKey, payload],
          [fetchedAtKey, String(Date.now())],
        ]);
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError : new Error(String(nextError)),
        );
        setIsLoading(false);
      }
    },
    [],
  );

  const reload = useCallback(
    async (options?: { forceNetwork?: boolean }) => {
      const userId = session?.user.id;

      if (!userId) {
        setProfile(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setError(null);

      if (options?.forceNetwork) {
        await refreshFromNetwork(userId, false);
        return;
      }

      const memoryProfile = profileMemoryCache.get(userId);
      if (
        memoryProfile &&
        Date.now() - memoryProfile.fetchedAt <= profileCacheTtlMs
      ) {
        setProfile(memoryProfile.value);
        setIsLoading(false);
        return;
      }

      const payloadKey = buildPayloadKey(userId);
      const fetchedAtKey = buildFetchedAtKey(userId);

      const [cachedPayload, cachedFetchedAt] = await AsyncStorage.multiGet([
        payloadKey,
        fetchedAtKey,
      ]);

      const cachedPayloadText = cachedPayload[1];
      const cachedFetchedAtText = cachedFetchedAt[1];

      if (cachedPayloadText) {
        const cachedProfile = parseCachedProfile(cachedPayloadText);
        if (cachedProfile) {
          profileMemoryCache.set(userId, {
            fetchedAt: cachedFetchedAtText ? Number(cachedFetchedAtText) : 0,
            value: cachedProfile,
          });
          setProfile(cachedProfile);
          setIsLoading(false);

          const fetchedAtMs = cachedFetchedAtText
            ? Number(cachedFetchedAtText)
            : NaN;
          const isStale =
            Number.isNaN(fetchedAtMs) ||
            Date.now() - fetchedAtMs > profileCacheTtlMs;

          if (isStale) {
            void refreshFromNetwork(userId, true);
          }

          return;
        }
      }

      await refreshFromNetwork(userId, false);
    },
    [session?.user.id, refreshFromNetwork],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const setAvatarUrl = useCallback(
    async (avatarUrl: string | null) => {
      const userId = session?.user.id;

      if (!userId || !profile) {
        return;
      }

      const nextProfile: ConsumerProfileView = {
        ...profile,
        avatarUrl,
        updatedAt: new Date(),
      };

      setProfile(nextProfile);
      profileMemoryCache.set(userId, {
        fetchedAt: Date.now(),
        value: nextProfile,
      });

      const payload = JSON.stringify(
        toConsumerProfileViewCachePayload(nextProfile),
      );

      await AsyncStorage.multiSet([
        [buildPayloadKey(userId), payload],
        [buildFetchedAtKey(userId), String(Date.now())],
      ]);
    },
    [profile, session?.user.id],
  );

  return { profile, isLoading, error, reload, setAvatarUrl };
}
