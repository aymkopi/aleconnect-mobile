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

export type SaveNotificationSettingsInput = {
  readonly receivePushNotifications: boolean;
  readonly receiveAdvisories: boolean;
  readonly selectedSubstationIds: string[];
  readonly selectedFeederIds: string[];
};

export async function fetchNotificationSettings() {
  return apiRequest<NotificationSettings>("/api/mobile/push-notifications");
}

export async function saveNotificationSettings(
  input: SaveNotificationSettingsInput,
) {
  return apiRequest<NotificationSettings>("/api/mobile/push-notifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
