import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";

export type HotlineContact = {
  readonly id: string;
  readonly number: string;
  readonly label: string | null;
  readonly type: string | null;
};

export type HotlineAgency = {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string | null;
  readonly address: string | null;
  readonly logoUrl: string | null;
  readonly websiteLink: string | null;
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
};

const cacheKey = "hotlines_cache_v2";
const cacheTtlMs = 24 * 60 * 60 * 1000;
let memoryCache: { fetchedAt: number; value: HotlineResponse } | null = null;
let request: Promise<HotlineResponse> | null = null;

async function readCache() {
  if (memoryCache && Date.now() - memoryCache.fetchedAt <= cacheTtlMs) {
    return memoryCache.value;
  }

  const raw = await AsyncStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as typeof memoryCache;
    if (!parsed || Date.now() - parsed.fetchedAt > cacheTtlMs) return null;
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
  if (!options?.force) {
    const cached = await readCache();
    if (cached) return cached;
  }

  if (request) return request;

  request = apiRequest<HotlineResponse>("/api/mobile/hotlines")
    .then(async (data) => {
      await writeCache(data);
      return data;
    })
    .finally(() => {
      request = null;
    });

  return request;
}
