import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";
import { claimRefresh } from "@/utils/refresh-cooldown";

export type MobileAdvisory = {
  readonly id: string;
  readonly controlNumber: string | null;
  readonly type: string | null;
  readonly title: string;
  readonly content: string;
  readonly severity: string;
  readonly audience?: string | null;
  readonly effectiveAt: string | null;
  readonly expiresAt: string | null;
  readonly scheduledStartAt: string | null;
  readonly scheduledEndAt: string | null;
  readonly publishedAt: string;
};

export type MobileAdvisoryPage = {
  readonly advisories: MobileAdvisory[];
  readonly nextCursor: string | null;
  readonly isStale?: boolean;
};

type AdvisoryCache = {
  readonly fetchedAt: number;
  readonly limit: number;
  readonly value: MobileAdvisoryPage;
};

const cachePrefix = "active_advisories_cache_v2";
const cacheTtlMs = 5 * 60 * 1000;
const staleTtlMs = 24 * 60 * 60 * 1000;
const requests = new Map<string, Promise<MobileAdvisoryPage>>();

export type AdvisoryScope = { userId: string; identityUserId?: string; accessRevision?: number };

export function advisoryScopeKey(scope: AdvisoryScope) {
  return `${scope.identityUserId ?? scope.userId}:${scope.accessRevision ?? 0}`;
}

function cacheKey(scope: AdvisoryScope) {
  return `${cachePrefix}:${advisoryScopeKey(scope)}`;
}

async function readCache(scope: AdvisoryScope, limit: number, allowStale = false) {
  const raw = await AsyncStorage.getItem(cacheKey(scope));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as AdvisoryCache;
    const age = Date.now() - cached.fetchedAt;
    const maxAge = allowStale ? staleTtlMs : cacheTtlMs;
    if (cached.limit < limit || age > maxAge) return null;

    return {
      ...cached.value,
      advisories: cached.value.advisories.slice(0, limit),
      isStale: allowStale && age > cacheTtlMs,
    };
  } catch {
    return null;
  }
}

async function writeCache(
  scope: AdvisoryScope,
  limit: number,
  value: MobileAdvisoryPage,
) {
  const cached: AdvisoryCache = {
    fetchedAt: Date.now(),
    limit,
    value,
  };
  await AsyncStorage.setItem(cacheKey(scope), JSON.stringify(cached));
}

export async function fetchActiveAdvisories(options: {
  readonly userId: string;
  readonly identityUserId?: string;
  readonly accessRevision?: number;
  readonly limit?: number;
  readonly cursor?: string | null;
  readonly force?: boolean;
}): Promise<MobileAdvisoryPage> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const cursor = options.cursor ?? null;
  const scope: AdvisoryScope = options;
  const scopeKey = advisoryScopeKey(scope);
  const force = Boolean(options.force) && claimRefresh(`advisories:${scopeKey}`);

  if (!cursor && !force) {
    const cached = await readCache(scope, limit);
    if (cached) return cached;
  }

  const requestKey = `${scopeKey}:${limit}:${cursor ?? "first"}`;
  const existing = requests.get(requestKey);
  if (existing) return existing;

  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const request = apiRequest<MobileAdvisoryPage>(
    `/api/mobile/advisories?${params.toString()}`,
  )
    .then(async (response) => {
      if (!cursor) await writeCache(scope, limit, response);
      return response;
    })
    .catch(async (error) => {
      if (!cursor) {
        const stale = await readCache(scope, limit, true);
        if (stale) return stale;
      }
      throw error;
    })
    .finally(() => {
      requests.delete(requestKey);
    });

  requests.set(requestKey, request);
  return request;
}

export async function clearAdvisoryCache(scope: AdvisoryScope) {
  await AsyncStorage.removeItem(cacheKey(scope));
}

export async function fetchActiveAdvisory(
  id: string,
  scope: AdvisoryScope,
): Promise<MobileAdvisory> {
  const response = await apiRequest<{ advisory: MobileAdvisory }>(
    `/api/mobile/advisories/${encodeURIComponent(id)}`,
  );
  return response.advisory;
}
