import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest, ApiRequestError } from "@/services/api";
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
  /** Present for account-scoped rows; identity-level events deliberately omit it. */
  serviceAccountId: string | null;
  accountNumber: string | null;
  accountName: string | null;
  identityLevel: boolean;
};

export type MobileNotificationsResponse = {
  unreadCount: number;
  notifications: MobileNotification[];
  nextCursor: string | null;
  isStale?: boolean;
  accessRevision?: number;
};

const cachePrefix = "notification_list_cache_v3";
const cacheTtlMs = 60_000;
const staleTtlMs = 24 * 60 * 60 * 1000;
const listeners = new Set<() => void>();
const requests = new Map<string, Promise<MobileNotificationsResponse>>();

function cacheKey(identityUserId: string, accessRevision: number, filtersKey: string) {
  return `${cachePrefix}:${identityUserId}:${accessRevision}:${filtersKey}`;
}

async function readCache(identityUserId: string, accessRevision: number, filtersKey: string, allowStale = false) {
  const raw = await AsyncStorage.getItem(cacheKey(identityUserId, accessRevision, filtersKey));
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
  identityUserId: string,
  accessRevision: number,
  filtersKey: string,
  value: MobileNotificationsResponse,
) {
  await AsyncStorage.setItem(
    cacheKey(identityUserId, accessRevision, filtersKey),
    JSON.stringify({ fetchedAt: Date.now(), value }),
  );
}

export function subscribeNotificationsChanged(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function invalidateNotifications(userId?: string, accessRevision?: number, isCurrent?: () => boolean) {
  if (isCurrent && !isCurrent()) return;
  if (userId) {
    const prefix = `${cachePrefix}:${userId}:${accessRevision === undefined ? "" : `${accessRevision}:`}`;
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    if (isCurrent && !isCurrent()) return;
    if (keys.length) await AsyncStorage.multiRemove(keys);
  }
  if (isCurrent && !isCurrent()) return;
  listeners.forEach((listener) => listener());
}

function normalizeNotification(value: MobileNotification): MobileNotification {
  return {
    ...value,
    entityType: value.entityType === "account_linking" ? "account_linking" : value.entityType,
    serviceAccountId: typeof value.serviceAccountId === "string" ? value.serviceAccountId : null,
    accountNumber: typeof value.accountNumber === "string" ? value.accountNumber : null,
    accountName: typeof value.accountName === "string" ? value.accountName : null,
    identityLevel: value.identityLevel === true,
  };
}

function normalizeResponse(response: MobileNotificationsResponse): MobileNotificationsResponse {
  return { ...response, notifications: response.notifications.map(normalizeNotification) };
}

export async function fetchNotifications(options: {
  readonly userId: string;
  /** Identity principal and revision prevent a former account owner seeing stale private rows. */
  readonly identityUserId?: string;
  readonly accessRevision?: number;
  readonly sessionId?: string;
  readonly isCurrent?: () => boolean;
  readonly serviceAccountId?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly force?: boolean;
  readonly unread?: boolean;
  readonly categories?: MobileNotificationCategory[];
}): Promise<MobileNotificationsResponse> {
  const identityUserId = options.identityUserId ?? options.userId;
  const accessRevision = options.accessRevision ?? 0;
  const cursor = options.cursor ?? null;
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const categories = Array.from(new Set(options.categories ?? [])).sort();
  const accountFilter = options.serviceAccountId?.trim() ?? "all";
  const filtersKey = `unread=${Boolean(options.unread)}&categories=${categories.join(",") || "all"}&account=${accountFilter}`;
  const force =
    Boolean(options.force) &&
    claimRefresh(`notifications:${identityUserId}:${accessRevision}:${filtersKey}`);

  const assertCurrent = () => {
    if (options.isCurrent && !options.isCurrent()) throw new ApiRequestError("Account access changed. Refresh notifications.", 409);
  };
  assertCurrent();

  if (!cursor && !force) {
    const cached = await readCache(identityUserId, accessRevision, filtersKey);
    assertCurrent();
    if (cached) return cached;
  }

  const requestKey = `${identityUserId}:${accessRevision}:${options.sessionId ?? "legacy"}:${cursor ?? "first"}:${limit}:${filtersKey}`;
  const existing = requests.get(requestKey);
  if (existing) return existing;

  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (options.unread) params.set("unread", "true");
  if (categories.length) params.set("categories", categories.join(","));
  if (accountFilter !== "all") params.set("serviceAccountId", accountFilter);

  const request = apiRequest<MobileNotificationsResponse>(
    `/api/mobile/notifications?${params.toString()}`,
  )
    .then(async (response) => {
      assertCurrent();
      if (response.accessRevision !== undefined && response.accessRevision !== accessRevision) {
        throw new ApiRequestError("Your account access changed. Refresh notifications.", 409);
      }
      const normalized = normalizeResponse(response);
      if (!cursor) await writeCache(identityUserId, accessRevision, filtersKey, normalized);
      return normalized;
    })
    .catch(async (error) => {
      assertCurrent();
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403 || status === 409) {
        await invalidateNotifications(identityUserId, accessRevision, options.isCurrent);
        throw error;
      }
      if (!cursor && !(status && status >= 400 && status < 500)) {
        const stale = await readCache(identityUserId, accessRevision, filtersKey, true);
        assertCurrent();
        if (stale) return { ...stale, isStale: true };
      }
      throw error;
    })
    .finally(() => requests.delete(requestKey));

  requests.set(requestKey, request);
  return request;
}

type NotificationMutationScope = { identityUserId?: string; accessRevision?: number; serviceAccountId?: string | null; isCurrent?: () => boolean };

function mutationPath(scope?: NotificationMutationScope) {
  return scope?.serviceAccountId ? `/api/mobile/notifications?${new URLSearchParams({ serviceAccountId: scope.serviceAccountId })}` : "/api/mobile/notifications";
}

export async function markNotificationsRead(ids: string[], userId: string, scope?: NotificationMutationScope) {
  if (scope?.isCurrent && !scope.isCurrent()) throw new ApiRequestError("Account access changed. Refresh notifications.", 409);
  const response = await apiRequest<MobileNotificationsResponse>(
    mutationPath(scope),
    {
      method: "POST",
      body: JSON.stringify({ action: "markRead", ids, accessRevision: scope?.accessRevision }),
    },
  );
  await invalidateNotifications(scope?.identityUserId ?? userId, scope?.accessRevision, scope?.isCurrent);
  return normalizeResponse(response);
}

export async function markAllNotificationsRead(userId: string, scope?: NotificationMutationScope) {
  if (scope?.isCurrent && !scope.isCurrent()) throw new ApiRequestError("Account access changed. Refresh notifications.", 409);
  const response = await apiRequest<MobileNotificationsResponse>(
    mutationPath(scope),
    {
      method: "POST",
      body: JSON.stringify({ action: "markAllRead", accessRevision: scope?.accessRevision }),
    },
  );
  await invalidateNotifications(scope?.identityUserId ?? userId, scope?.accessRevision, scope?.isCurrent);
  return normalizeResponse(response);
}
