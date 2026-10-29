import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fromConsumerProfileViewCachePayload, toConsumerProfileViewCachePayload, type ConsumerProfileView, type ConsumerProfileViewCachePayload } from "@/models/consumer-profile-view";
import { fetchCurrentConsumerProfileView, type ConsumerProfileScope } from "@/services/profile";
import { isConsumerReadTransportError } from "@/services/consumer-account-cache";

const profileCacheTtlMs = 24 * 60 * 60 * 1000;
const profileCachePayloadPrefix = "profile_cache_payload_v4";
const profileCacheFetchedAtPrefix = "profile_cache_fetched_at_v4";
const profileMemoryCache = new Map<string, { fetchedAt: number; value: ConsumerProfileView | null }>();
const profileRequests = new Map<string, Promise<ConsumerProfileView | null>>();
let cacheGeneration = 0;
let storageWrites = Promise.resolve();
function keyFor(principalId: string, identityUserId: string, scope: ConsumerProfileScope) {
  return JSON.stringify([principalId, identityUserId, scope.serviceAccountId, scope.accessRevision]);
}
function payloadKey(key: string) { return `${profileCachePayloadPrefix}:${key}`; }
function fetchedAtKey(key: string) { return `${profileCacheFetchedAtPrefix}:${key}`; }
function parseCachedProfile(payloadText: string, serviceAccountId: string): ConsumerProfileView | null {
  try {
    const profile = fromConsumerProfileViewCachePayload(JSON.parse(payloadText) as ConsumerProfileViewCachePayload);
    return profile.profileId === serviceAccountId && typeof profile.fullName === "string" &&
      Number.isFinite(profile.createdAt.getTime()) && Number.isFinite(profile.updatedAt.getTime()) ? profile : null;
  } catch { return null; }
}
async function storeProfileCache(key: string, value: ConsumerProfileView | null, current: () => boolean) {
  const generation = cacheGeneration;
  const write = storageWrites.then(async () => {
    if (generation !== cacheGeneration || !current()) return;
    const fetchedAt = Date.now();
    profileMemoryCache.set(key, { fetchedAt, value });
    if (!value) await AsyncStorage.multiRemove([payloadKey(key), fetchedAtKey(key)]);
    else await AsyncStorage.multiSet([[payloadKey(key), JSON.stringify(toConsumerProfileViewCachePayload(value))], [fetchedAtKey(key), String(fetchedAt)]]);
  });
  storageWrites = write.catch(() => {});
  await write;
}
export async function clearConsumerProfileCaches(): Promise<void> {
  cacheGeneration += 1;
  profileMemoryCache.clear(); profileRequests.clear();
  const clear = storageWrites.then(async () => {
    const keys = (await AsyncStorage.getAllKeys()).filter(key => /^profile_cache_(payload|fetched_at)_v\d+:/.test(key));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  });
  storageWrites = clear.catch(() => {});
  await clear;
}
export async function warmConsumerProfileCache(principalId: string, identityUserId: string, scope: ConsumerProfileScope, isCurrent = () => true): Promise<ConsumerProfileView | null | undefined> {
  const key = keyFor(principalId, identityUserId, scope), generation = cacheGeneration;
  const current = () => generation === cacheGeneration && isCurrent();
  const request = profileRequests.get(key) ?? fetchCurrentConsumerProfileView(scope);
  profileRequests.set(key, request);
  try {
    const profile = await request;
    if (!current()) return;
    if (profile && profile.profileId !== scope.serviceAccountId) throw Object.assign(new Error("Account profile changed. Refresh your account access."), { code: "PROFILE_SCOPE_MISMATCH" });
    await storeProfileCache(key, profile, current);
    return current() ? profile : undefined;
  } catch (error) {
    if (current() && !isConsumerReadTransportError(error)) await storeProfileCache(key, null, current);
    throw error;
  } finally { if (profileRequests.get(key) === request) profileRequests.delete(key); }
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
  const [selectedServiceAccountId, setSelectedServiceAccountId] = useState<string | null>(null);
  const serviceAccountId = selectedServiceAccountId && accountContext?.authorizedServiceAccountIds.includes(selectedServiceAccountId)
    ? selectedServiceAccountId : accountContext?.defaultServiceAccountId ?? session?.user.id ?? null;
  const profileScope = useMemo<ConsumerProfileScope | null>(() => serviceAccountId && session && accountContext?.authorizedServiceAccountIds.includes(serviceAccountId) ? { serviceAccountId, accessRevision: accountContext.accessRevision } : null, [accountContext, serviceAccountId, session]);
  const identityUserId = accountContext?.identityUserId ?? session?.user.id ?? null;
  const principalId = session?.user.id ?? null;
  const cacheKey = profileScope && identityUserId && principalId ? keyFor(principalId, identityUserId, profileScope) : null;
  const activeCacheKey = useRef(cacheKey); activeCacheKey.current = cacheKey;
  const [profile, setProfile] = useState<ConsumerProfileView | null>(null);
  const [profileCacheKey, setProfileCacheKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshFromNetwork = useCallback(async (key: string, scope: ConsumerProfileScope, keepCachedVisible: boolean) => {
    if (!principalId || !identityUserId) return;
    const generation = cacheGeneration, current = () => generation === cacheGeneration && activeCacheKey.current === key;
    if (!keepCachedVisible) setIsLoading(true);
    try {
      const next = await warmConsumerProfileCache(principalId, identityUserId, scope, current);
      if (!current() || next === undefined) return;
      setProfile(next); setProfileCacheKey(key); setError(null);
    } catch (nextError) {
      if (!current()) return;
      if (!isConsumerReadTransportError(nextError)) { setProfile(null); setProfileCacheKey(null); }
      setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
    } finally { if (current()) setIsLoading(false); }
  }, [principalId, identityUserId]);
  const reload = useCallback(async (options?: { forceNetwork?: boolean }) => {
    if (!cacheKey || !profileScope) { setProfile(null); setProfileCacheKey(null); setError(null); setIsLoading(false); return; }
    const generation = cacheGeneration;
    setError(null);
    if (options?.forceNetwork) return refreshFromNetwork(cacheKey, profileScope, false);
    const memory = profileMemoryCache.get(cacheKey);
    if (memory && Date.now() - memory.fetchedAt <= profileCacheTtlMs) { setProfile(memory.value); setProfileCacheKey(cacheKey); setIsLoading(false); return; }
    await storageWrites;
    const [cachedPayload, cachedFetchedAt] = await AsyncStorage.multiGet([payloadKey(cacheKey), fetchedAtKey(cacheKey)]);
    if (activeCacheKey.current !== cacheKey || generation !== cacheGeneration) return;
    const cached = cachedPayload[1] ? parseCachedProfile(cachedPayload[1], profileScope.serviceAccountId) : null;
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
  const storeProfile = useCallback(async (next: ConsumerProfileView) => {
    if (!cacheKey || !profileScope || next.profileId !== profileScope.serviceAccountId) return;
    const current = () => activeCacheKey.current === cacheKey;
    await storeProfileCache(cacheKey, next, current);
    if (current()) { setProfile(next); setProfileCacheKey(cacheKey); setError(null); }
  }, [cacheKey, profileScope]);
  const setAvatarUrl = useCallback(async (avatarUrl: string | null) => {
    if (profile) await storeProfile({ ...profile, avatarUrl, updatedAt: new Date() });
  }, [profile, storeProfile]);
  return { profile: profileCacheKey === cacheKey ? profile : null, isLoading, error, profileScope, setServiceAccountId, reload, setAvatarUrl, setProfileView: storeProfile };
}
