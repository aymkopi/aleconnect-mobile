import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";
import { claimRefresh } from "@/utils/refresh-cooldown";

export type MobileNotificationCategory =
  | "report_updates"
  | "area_incidents"
  | "advisories"
  | "system";

export type MobileNotification = {
  id: string;
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  isRead: boolean;
  severity: string;
  ticketId: string | null;
  ticketNumber: string | null;
  category: MobileNotificationCategory;
};

export type MobileNotificationsResponse = {
  unreadCount: number;
  notifications: MobileNotification[];
  nextCursor: string | null;
  isStale?: boolean;
};

const cachePrefix = "notification_list_cache_v2";
const cacheTtlMs = 60_000;
const staleTtlMs = 24 * 60 * 60 * 1000;
const listeners = new Set<() => void>();
const requests = new Map<string, Promise<MobileNotificationsResponse>>();

function cacheKey(userId: string, filtersKey: string) {
  return `${cachePrefix}:${userId}:${filtersKey}`;
}

async function readCache(userId: string, filtersKey: string, allowStale = false) {
  const raw = await AsyncStorage.getItem(cacheKey(userId, filtersKey));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as {
      fetchedAt: number;
      value: MobileNotificationsResponse;
    };
    const age = Date.now() - cached.fetchedAt;
    if (age > (allowStale ? staleTtlMs : cacheTtlMs)) return null;
    return {
      ...cached.value,
      isStale: allowStale && age > cacheTtlMs,
    };
  } catch {
    return null;
  }
}

async function writeCache(
  userId: string,
  filtersKey: string,
  value: MobileNotificationsResponse,
) {
  await AsyncStorage.setItem(
    cacheKey(userId, filtersKey),
    JSON.stringify({ fetchedAt: Date.now(), value }),
  );
}

export function subscribeNotificationsChanged(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function invalidateNotifications(userId?: string) {
  if (userId) {
    const prefix = `${cachePrefix}:${userId}:`;
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  }
  listeners.forEach((listener) => listener());
}

export async function fetchNotifications(options: {
  readonly userId: string;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly force?: boolean;
  readonly unread?: boolean;
  readonly categories?: MobileNotificationCategory[];
}): Promise<MobileNotificationsResponse> {
  const cursor = options.cursor ?? null;
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const categories = Array.from(new Set(options.categories ?? [])).sort();
  const filtersKey = `unread=${Boolean(options.unread)}&categories=${categories.join(",") || "all"}`;
  const force =
    Boolean(options.force) &&
    claimRefresh(`notifications:${options.userId}:${filtersKey}`);

  if (!cursor && !force) {
    const cached = await readCache(options.userId, filtersKey);
    if (cached) return cached;
  }

  const requestKey = `${options.userId}:${cursor ?? "first"}:${limit}:${filtersKey}`;
  const existing = requests.get(requestKey);
  if (existing) return existing;

  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (options.unread) params.set("unread", "true");
  if (categories.length) params.set("categories", categories.join(","));

  const request = apiRequest<MobileNotificationsResponse>(
    `/api/mobile/notifications?${params.toString()}`,
  )
    .then(async (response) => {
      if (!cursor) await writeCache(options.userId, filtersKey, response);
      return response;
    })
    .catch(async (error) => {
      if (!cursor) {
        const stale = await readCache(options.userId, filtersKey, true);
        if (stale) return stale;
      }
      throw error;
    })
    .finally(() => requests.delete(requestKey));

  requests.set(requestKey, request);
  return request;
}

export async function markNotificationsRead(ids: string[], userId: string) {
  const response = await apiRequest<MobileNotificationsResponse>(
    "/api/mobile/notifications",
    {
      method: "POST",
      body: JSON.stringify({ action: "markRead", ids }),
    },
  );
  await invalidateNotifications(userId);
  return response;
}

export async function markAllNotificationsRead(userId: string) {
  const response = await apiRequest<MobileNotificationsResponse>(
    "/api/mobile/notifications",
    {
      method: "POST",
      body: JSON.stringify({ action: "markAllRead" }),
    },
  );
  await invalidateNotifications(userId);
  return response;
}
