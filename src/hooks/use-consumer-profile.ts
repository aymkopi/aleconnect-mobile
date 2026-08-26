import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fromConsumerProfileViewCachePayload, toConsumerProfileViewCachePayload, type ConsumerProfileView, type ConsumerProfileViewCachePayload } from "@/models/consumer-profile-view";
import { fetchCurrentConsumerProfileView, type ConsumerProfileScope } from "@/services/profile";

const profileCacheTtlMs = 24 * 60 * 60 * 1000;
const profileCachePayloadPrefix = "profile_cache_payload_v3";
const profileCacheFetchedAtPrefix = "profile_cache_fetched_at_v3";
const profileMemoryCache = new Map<string, { fetchedAt: number; value: ConsumerProfileView | null }>();
const profileRequests = new Map<string, Promise<ConsumerProfileView | null>>();

function keyFor(identityUserId: string, scope: ConsumerProfileScope) {
  return `${identityUserId}:${scope.serviceAccountId}:${scope.accessRevision}`;
}
function payloadKey(key: string) { return `${profileCachePayloadPrefix}:${key}`; }
function fetchedAtKey(key: string) { return `${profileCacheFetchedAtPrefix}:${key}`; }
function parseCachedProfile(payloadText: string): ConsumerProfileView | null {
  try { return fromConsumerProfileViewCachePayload(JSON.parse(payloadText) as ConsumerProfileViewCachePayload); } catch { return null; }
}

export async function clearConsumerProfileCaches(): Promise<void> {
  profileMemoryCache.clear();
  profileRequests.clear();
  const keys = await AsyncStorage.getAllKeys();
  const privateKeys = keys.filter((key) => key.startsWith(`${profileCachePayloadPrefix}:`) || key.startsWith(`${profileCacheFetchedAtPrefix}:`));
  if (privateKeys.length) await AsyncStorage.multiRemove(privateKeys);
}

export type UseConsumerProfileState = {
  readonly profile: ConsumerProfileView | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly profileScope: ConsumerProfileScope | null;
  readonly setServiceAccountId: (serviceAccountId: string | null) => void;
  readonly reload: (options?: { forceNetwork?: boolean }) => Promise<void>;
  readonly setAvatarUrl: (avatarUrl: string | null) => Promise<void>;
  readonly setProfileView: (profile: ConsumerProfileView) => Promise<void>;
};

export function useConsumerProfile(): UseConsumerProfileState {
  const { session } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const activeUserIdRef = useRef(session?.user.id);
  activeUserIdRef.current = session?.user.id;
  const [selectedServiceAccountId, setSelectedServiceAccountId] = useState<string | null>(null);
  const serviceAccountId = selectedServiceAccountId ?? accountContext?.defaultServiceAccountId ?? session?.user.id ?? null;
  const profileScope = useMemo<ConsumerProfileScope | null>(() => serviceAccountId ? { serviceAccountId, accessRevision: accountContext?.accessRevision ?? 0 } : null, [accountContext?.accessRevision, serviceAccountId]);
  const identityUserId = accountContext?.identityUserId ?? session?.user.id ?? null;
  const cacheKey = profileScope && identityUserId ? keyFor(identityUserId, profileScope) : null;
  const activeCacheKeyRef = useRef(cacheKey);
  activeCacheKeyRef.current = cacheKey;
  const [profile, setProfile] = useState<ConsumerProfileView | null>(null);
  const [profileCacheKey, setProfileCacheKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshFromNetwork = useCallback(async (key: string, scope: ConsumerProfileScope, keepCachedVisible: boolean) => {
    if (!keepCachedVisible) setIsLoading(true);
    try {
      const request = profileRequests.get(key) ?? fetchCurrentConsumerProfileView(scope);
      profileRequests.set(key, request);
      const nextProfile = await request.finally(() => profileRequests.delete(key));
      profileMemoryCache.set(key, { fetchedAt: Date.now(), value: nextProfile });
      if (activeCacheKeyRef.current !== key || !activeUserIdRef.current) return;
      setProfile(nextProfile); setProfileCacheKey(key); setError(null); setIsLoading(false);
      if (!nextProfile) { await AsyncStorage.multiRemove([payloadKey(key), fetchedAtKey(key)]); return; }
      await AsyncStorage.multiSet([[payloadKey(key), JSON.stringify(toConsumerProfileViewCachePayload(nextProfile))], [fetchedAtKey(key), String(Date.now())]]);
    } catch (nextError) {
      if (activeCacheKeyRef.current !== key || !activeUserIdRef.current) return;
      setError(nextError instanceof Error ? nextError : new Error(String(nextError))); setIsLoading(false);
    }
  }, []);

  const reload = useCallback(async (options?: { forceNetwork?: boolean }) => {
    if (!cacheKey || !profileScope) { setProfile(null); setProfileCacheKey(null); setError(null); setIsLoading(false); return; }
    setError(null);
    if (options?.forceNetwork) return refreshFromNetwork(cacheKey, profileScope, false);
    const memory = profileMemoryCache.get(cacheKey);
    if (memory && Date.now() - memory.fetchedAt <= profileCacheTtlMs) { setProfile(memory.value); setProfileCacheKey(cacheKey); setIsLoading(false); return; }
    const [cachedPayload, cachedFetchedAt] = await AsyncStorage.multiGet([payloadKey(cacheKey), fetchedAtKey(cacheKey)]);
    if (activeCacheKeyRef.current !== cacheKey) return;
    const cached = cachedPayload[1] ? parseCachedProfile(cachedPayload[1]) : null;
    if (cached) {
      const fetchedAt = Number(cachedFetchedAt[1] ?? 0);
      profileMemoryCache.set(cacheKey, { fetchedAt, value: cached }); setProfile(cached); setProfileCacheKey(cacheKey); setIsLoading(false);
      if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt > profileCacheTtlMs) void refreshFromNetwork(cacheKey, profileScope, true);
      return;
    }
    await refreshFromNetwork(cacheKey, profileScope, false);
  }, [cacheKey, profileScope, refreshFromNetwork]);

  useEffect(() => { void reload(); }, [reload]);

  const setServiceAccountId = useCallback((next: string | null) => {
    if (next && !accountContext?.authorizedServiceAccountIds.includes(next)) return;
    setSelectedServiceAccountId(next);
  }, [accountContext?.authorizedServiceAccountIds]);

  const storeProfile = useCallback(async (nextProfile: ConsumerProfileView) => {
    if (!cacheKey || !profileScope || nextProfile.profileId !== profileScope.serviceAccountId) return;
    setProfile(nextProfile); setProfileCacheKey(cacheKey); setError(null);
    profileMemoryCache.set(cacheKey, { fetchedAt: Date.now(), value: nextProfile });
    await AsyncStorage.multiSet([[payloadKey(cacheKey), JSON.stringify(toConsumerProfileViewCachePayload(nextProfile))], [fetchedAtKey(cacheKey), String(Date.now())]]);
  }, [cacheKey, profileScope]);

  const setAvatarUrl = useCallback(async (avatarUrl: string | null) => {
    if (!profile) return;
    await storeProfile({ ...profile, avatarUrl, updatedAt: new Date() });
  }, [profile, storeProfile]);

  const visibleProfile = profileCacheKey === cacheKey ? profile : null;
  return { profile: visibleProfile, isLoading, error, profileScope, setServiceAccountId, reload, setAvatarUrl, setProfileView: storeProfile };
}
