import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";
import { claimRefresh } from "@/utils/refresh-cooldown";

export type HotlineContact = {
  readonly id: string;
  readonly number: string;
  readonly label: string | null;
  readonly type: string | null;
  readonly group: "Hotline/Emergency" | "Other service contacts";
};

export type HotlineAgency = {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string | null;
  readonly address: string | null;
  readonly logoUrl: string | null;
  readonly websiteLink: string | null;
  readonly avatarVersion: string | null;
  readonly contacts: HotlineContact[];
};

export type HotlineCategory = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly agencies: HotlineAgency[];
};

type HotlineResponse = {
  readonly categories: HotlineCategory[];
  readonly isStale?: boolean;
};

const cacheKey = "hotlines_cache_v4";
const cacheTtlMs = 24 * 60 * 60 * 1000;
let memoryCache: { fetchedAt: number; value: HotlineResponse } | null = null;
let request: Promise<HotlineResponse> | null = null;

async function readCache(allowStale = false) {
  if (
    memoryCache &&
    (allowStale || Date.now() - memoryCache.fetchedAt <= cacheTtlMs)
  ) {
    return memoryCache.value;
  }

  const raw = await AsyncStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as typeof memoryCache;
    if (
      !parsed ||
      (!allowStale && Date.now() - parsed.fetchedAt > cacheTtlMs)
    )
      return null;
    memoryCache = parsed;
    return parsed.value;
  } catch {
    return null;
  }
}

async function writeCache(value: HotlineResponse) {
  memoryCache = { fetchedAt: Date.now(), value };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(memoryCache));
}

export async function fetchHotlines(options?: { force?: boolean }) {
  const force =
    Boolean(options?.force) && claimRefresh("hotlines");
  if (!force) {
    const cached = await readCache();
    if (cached) return cached;
  }

  if (request) return request;

  request = apiRequest<HotlineResponse>("/api/mobile/hotlines")
    .then(async (data) => {
      await writeCache(data);
      return data;
    }, async (error) => {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(
          "[hotlines] refresh failed",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
      const stale = await readCache(true);
      if (stale) return { ...stale, isStale: true };
      throw error;
    })
    .finally(() => {
      request = null;
    });

  return request;
}
