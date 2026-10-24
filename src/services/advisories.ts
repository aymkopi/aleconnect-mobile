import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";
import { claimRefresh } from "@/utils/refresh-cooldown";
import { normalizeHumanReference } from "@/utils/human-reference";
import { normalizeReminderOccurrences, type ReminderOccurrence } from "@/features/advisories/reminder-contract";

export type MobileAdvisory = {
  readonly id: string;
  readonly controlNumber: string | null;
  readonly type: string | null;
  readonly topic?: string | null;
  readonly title: string;
  readonly content: string;
  readonly severity: string;
  readonly audience?: string | null;
  readonly effectiveAt: string | null;
  readonly expiresAt: string | null;
  readonly scheduledStartAt: string | null;
  readonly scheduledEndAt: string | null;
  readonly publishedAt: string;
  readonly photos?: readonly MobilePublicPhoto[];
  readonly occurrences?: readonly ReminderOccurrence[];
  readonly publicationRevision?: number;
};

export type MobilePublicPhoto = {
  readonly id: string;
  readonly url: string;
  readonly altText: string;
  readonly position: number;
  readonly width: number | null;
  readonly height: number | null;
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

type UnknownRecord = Record<string, unknown>;

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function normalizePublicPhoto(value: unknown): MobilePublicPhoto {
  const record = value && typeof value === "object" ? value as UnknownRecord : {};
  return {
    id: typeof record.id === "string" ? record.id : "",
    url: typeof record.url === "string" ? record.url : "",
    altText: typeof record.altText === "string" ? record.altText : "",
    position: Number.isFinite(record.position) ? Number(record.position) : 0,
    width: Number.isFinite(record.width) ? Number(record.width) : null,
    height: Number.isFinite(record.height) ? Number(record.height) : null,
  };
}

/** Keep old cache entries usable when optional API fields were absent. */
export function normalizeMobileAdvisory(value: unknown): MobileAdvisory {
  const record = value && typeof value === "object" ? value as UnknownRecord : {};
  return {
    occurrences: normalizeReminderOccurrences(record.occurrences),
    publicationRevision: Number.isSafeInteger(record.publicationRevision) ? Number(record.publicationRevision) : 0,
    id: typeof record.id === "string" ? record.id : "",
    controlNumber: normalizeHumanReference(record.controlNumber),
    type: nullableString(record.type),
    topic: nullableString(record.topic)?.trim() || null,
    title: typeof record.title === "string" ? record.title : "",
    content: typeof record.content === "string" ? record.content : "",
    severity: typeof record.severity === "string" ? record.severity : "",
    audience: nullableString(record.audience),
    effectiveAt: nullableString(record.effectiveAt),
    expiresAt: nullableString(record.expiresAt),
    scheduledStartAt: nullableString(record.scheduledStartAt),
    scheduledEndAt: nullableString(record.scheduledEndAt),
    // publishedAt remains a required API field; an old cache missing it is
    // still readable and will be replaced by the next successful fetch.
    publishedAt: typeof record.publishedAt === "string" ? record.publishedAt : "",
    photos: Array.isArray(record.photos)
      ? record.photos.map(normalizePublicPhoto).filter((photo) => photo.url).sort((a, b) => a.position - b.position)
      : [],
  };
}

export function normalizeMobileAdvisoryPage(value: unknown): MobileAdvisoryPage {
  const record = value && typeof value === "object" ? value as UnknownRecord : {};
  const advisories = Array.isArray(record.advisories)
    ? record.advisories.map(normalizeMobileAdvisory)
    : [];
  return {
    advisories,
    nextCursor: nullableString(record.nextCursor),
    isStale: record.isStale === true ? true : undefined,
  };
}

const cachePrefix = "active_advisories_cache_v2";
const cacheTtlMs = 5 * 60 * 1000;
const staleTtlMs = 24 * 60 * 60 * 1000;
const requests = new Map<string, Promise<MobileAdvisoryPage>>();

export type AdvisoryScope = { userId: string; identityUserId?: string; accessRevision?: number; publicOnly?: boolean };

export function advisoryScopeKey(scope: AdvisoryScope) {
  return scope.publicOnly ? "public" : `${scope.identityUserId ?? scope.userId}:${scope.accessRevision ?? 0}`;
}

function cacheKey(scope: AdvisoryScope) {
  return `${cachePrefix}:${advisoryScopeKey(scope)}`;
}

async function readCache(scope: AdvisoryScope, limit: number, allowStale = false) {
  const raw = await AsyncStorage.getItem(cacheKey(scope));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as Partial<AdvisoryCache>;
    if (!Number.isFinite(cached.fetchedAt) || !Number.isFinite(cached.limit)) return null;
    const fetchedAt = Number(cached.fetchedAt);
    const cachedLimit = Number(cached.limit);
    const age = Date.now() - fetchedAt;
    const maxAge = allowStale ? staleTtlMs : cacheTtlMs;
    if (cachedLimit < limit || age > maxAge) return null;
    const value = normalizeMobileAdvisoryPage(cached.value);

    return {
      ...value,
      advisories: value.advisories.slice(0, limit),
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
    value: normalizeMobileAdvisoryPage(value),
  };
  await AsyncStorage.setItem(cacheKey(scope), JSON.stringify(cached));
}

export async function fetchActiveAdvisories(options: {
  readonly userId: string;
  readonly publicOnly?: boolean;
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
    `${options.publicOnly ? "/api/mobile/public/advisories" : "/api/mobile/advisories"}?${params.toString()}`,
    {},
    options.publicOnly ? { authToken: null } : {},
  )
    .then(async (response) => {
      const normalized = normalizeMobileAdvisoryPage(response);
      if (!cursor) await writeCache(scope, limit, normalized);
      return normalized;
    })
    .catch(async (error) => {
      const failure = error as { status?: number; code?: string } | null;
      if ([401, 403, 409].includes(failure?.status ?? 0) || ["ACCOUNT_NOT_ACCESSIBLE", "STALE_ACCESS_REVISION"].includes(failure?.code ?? "")) {
        await clearAdvisoryCache(scope);
        throw error;
      }
      if (!cursor) {
        const stale = await readCache(scope, limit, true);
        if (stale) return { ...stale, isStale: true };
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
    `${scope.publicOnly ? "/api/mobile/public/advisories" : "/api/mobile/advisories"}/${encodeURIComponent(id)}`,
    {},
    scope.publicOnly ? { authToken: null } : {},
  );
  return normalizeMobileAdvisory(response.advisory);
}
