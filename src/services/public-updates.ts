import AsyncStorage from "@react-native-async-storage/async-storage";

import { advisoryScopeKey, fetchActiveAdvisories, normalizeMobileAdvisory, normalizePublicPhoto, type AdvisoryScope, type MobileAdvisory, type MobilePublicPhoto } from "@/services/advisories";
import { apiRequest, ApiRequestError } from "@/services/api";
import { claimRefresh } from "@/utils/refresh-cooldown";

export type MobilePublicUpdate =
  | ({ readonly kind: "advisory" } & MobileAdvisory)
  | { readonly kind: "facebook_post"; readonly id: string; readonly message: string; readonly photos: readonly MobilePublicPhoto[]; readonly publishedAt: string; readonly permalink: string | null; readonly pageName: string | null };

export type MobilePublicUpdatesPage = { readonly items: MobilePublicUpdate[]; readonly nextCursor: string | null; readonly isStale?: boolean };
type PublicUpdatesCache = { fetchedAt: number; limit: number; value: MobilePublicUpdatesPage };
type UnknownRecord = Record<string, unknown>;

const cachePrefix = "public_updates_cache_v1";
const cacheTtlMs = 5 * 60 * 1000;
const staleTtlMs = 24 * 60 * 60 * 1000;
const requests = new Map<string, Promise<MobilePublicUpdatesPage>>();

function nullableString(value: unknown) {
  return typeof value === "string" && value.length ? value : null;
}

export function normalizeMobilePublicUpdate(value: unknown): MobilePublicUpdate | null {
  const record = value && typeof value === "object" ? value as UnknownRecord : {};
  if (record.kind === "advisory") return { kind: "advisory", ...normalizeMobileAdvisory(record) };
  if (record.kind !== "facebook_post" || typeof record.id !== "string") return null;
  return {
    kind: "facebook_post",
    id: record.id,
    message: typeof record.message === "string" ? record.message : "",
    photos: Array.isArray(record.photos) ? record.photos.map(normalizePublicPhoto).filter((photo) => photo.url).sort((a, b) => a.position - b.position) : [],
    publishedAt: typeof record.publishedAt === "string" ? record.publishedAt : "",
    permalink: nullableString(record.permalink),
    pageName: nullableString(record.pageName),
  };
}

function normalizePage(value: unknown): MobilePublicUpdatesPage {
  const record = value && typeof value === "object" ? value as UnknownRecord : {};
  return {
    items: Array.isArray(record.items) ? record.items.map(normalizeMobilePublicUpdate).filter((item): item is MobilePublicUpdate => Boolean(item)) : [],
    nextCursor: nullableString(record.nextCursor),
    isStale: record.isStale === true ? true : undefined,
  };
}

function cacheKey(scope: AdvisoryScope) {
  return `${cachePrefix}:${advisoryScopeKey(scope)}`;
}

async function readCache(scope: AdvisoryScope, limit: number, allowStale = false) {
  const raw = await AsyncStorage.getItem(cacheKey(scope));
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as Partial<PublicUpdatesCache>;
    if (!Number.isFinite(cached.fetchedAt) || !Number.isFinite(cached.limit) || Number(cached.limit) < limit) return null;
    const age = Date.now() - Number(cached.fetchedAt);
    if (age > (allowStale ? staleTtlMs : cacheTtlMs)) return null;
    const value = normalizePage(cached.value);
    return { ...value, items: value.items.slice(0, limit), isStale: allowStale && age > cacheTtlMs };
  } catch {
    return null;
  }
}

async function writeCache(scope: AdvisoryScope, limit: number, value: MobilePublicUpdatesPage) {
  await AsyncStorage.setItem(cacheKey(scope), JSON.stringify({ fetchedAt: Date.now(), limit, value: normalizePage(value) } satisfies PublicUpdatesCache));
}

export async function fetchPublicUpdates(options: AdvisoryScope & { limit?: number; cursor?: string | null; force?: boolean }): Promise<MobilePublicUpdatesPage> {
  const limit = Math.min(50, Math.max(1, options.limit ?? 25));
  const cursor = options.cursor ?? null;
  const { userId, identityUserId, accessRevision } = options;
  const scopeKey = advisoryScopeKey({ userId, identityUserId, accessRevision });
  const force = Boolean(options.force) && claimRefresh(`public-updates:${scopeKey}`);
  if (!cursor && !force) {
    const cached = await readCache(options, limit);
    if (cached) return cached;
  }
  const requestKey = `${scopeKey}:${limit}:${cursor ?? "first"}`;
  const existing = requests.get(requestKey);
  if (existing) return existing;
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const request = apiRequest<MobilePublicUpdatesPage>(`/api/mobile/public-updates?${params}`)
    .then(async (response) => {
      const normalized = normalizePage(response);
      if (!cursor) await writeCache(options, limit, normalized);
      return normalized;
    })
    .catch(async (error) => {
      if (error instanceof ApiRequestError && ([401, 403].includes(error.status ?? 0) || ["ACCOUNT_NOT_ACCESSIBLE", "STALE_ACCESS_REVISION"].includes(error.code ?? ""))) {
        await clearPublicUpdatesCache(options);
        throw error;
      }
      if (error instanceof ApiRequestError && [404, 405, 501].includes(error.status ?? 0)) {
        const fallback = await fetchActiveAdvisories({ ...options, limit, cursor, force });
        return { items: fallback.advisories.map((advisory) => ({ kind: "advisory" as const, ...advisory })), nextCursor: fallback.nextCursor, isStale: fallback.isStale };
      }
      if (!cursor) {
        const stale = await readCache(options, limit, true);
        if (stale) return stale;
      }
      throw error;
    })
    .finally(() => requests.delete(requestKey));
  requests.set(requestKey, request);
  return request;
}

export async function clearPublicUpdatesCache(scope: AdvisoryScope) {
  await AsyncStorage.removeItem(cacheKey(scope));
}
