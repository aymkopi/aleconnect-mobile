import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { apiRequest } from "@/services/api";

export type NotificationFeeder = {
  readonly id: string;
  readonly name: string;
};

export type NotificationSubstation = {
  readonly id: string;
  readonly name: string;
  readonly feeders: NotificationFeeder[];
};

export type NotificationPreferences = {
  readonly receivePushNotifications: boolean;
  readonly receiveAdvisories: boolean;
};

export type NotificationSettings = {
  readonly preferences: NotificationPreferences;
  readonly selectedSubstationIds: string[];
  readonly selectedFeederIds: string[];
  readonly substations: NotificationSubstation[];
};

export type NotificationSettingsResult = NotificationSettings & {
  readonly isStale?: boolean;
};

export type SaveNotificationSettingsInput = {
  readonly receivePushNotifications: boolean;
  readonly receiveAdvisories: boolean;
  readonly selectedSubstationIds: string[];
  readonly selectedFeederIds: string[];
};

type NotificationSettingsCache = {
  readonly fetchedAt: number;
  readonly value: NotificationSettings;
};

const cachePrefix = "notification_settings_cache_v1";

function cacheKey(userId: string) {
  return `${cachePrefix}:${userId}`;
}

async function readCache(userId: string) {
  const raw = await AsyncStorage.getItem(cacheKey(userId));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as NotificationSettingsCache;
    if (!cached?.value) return null;
    return cached.value;
  } catch {
    return null;
  }
}

async function writeCache(userId: string, value: NotificationSettings) {
  const cached: NotificationSettingsCache = {
    fetchedAt: Date.now(),
    value,
  };

  await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(cached));
}

export async function readCachedNotificationSettings(
  userId: string,
): Promise<NotificationSettingsResult | null> {
  const cached = await readCache(userId);
  return cached ? { ...cached, isStale: true } : null;
}

export async function fetchNotificationSettings(
  userId: string,
): Promise<NotificationSettingsResult> {
  try {
    const response = await apiRequest<NotificationSettings>(
      "/api/mobile/push-notifications",
    );
    await writeCache(userId, response);
    return { ...response, isStale: false };
  } catch (error) {
    const cached = await readCachedNotificationSettings(userId);
    if (cached) return cached;
    throw error;
  }
}

export async function saveNotificationSettings(
  userId: string,
  input: SaveNotificationSettingsInput,
): Promise<NotificationSettingsResult> {
  const response = await apiRequest<NotificationSettings>(
    "/api/mobile/push-notifications",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  await writeCache(userId, response);
  return { ...response, isStale: false };
}

export async function registerDevicePushToken(expoPushToken: string) {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;

  return apiRequest<{ ok: boolean }>("/api/mobile/push-notifications", {
    method: "POST",
    body: JSON.stringify({
      kind: "token",
      expoPushToken,
      platform: Platform.OS,
      deviceId: Device.osInternalBuildId ?? Device.deviceName ?? null,
    }),
  });
}
