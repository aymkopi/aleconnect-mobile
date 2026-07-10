import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { expoPushProjectId } from "@/constants";

export const notificationSoundChannels = {
  highCritical: {
    id: "alerts-high-critical",
    developmentId: "alerts-high-critical-dev",
    name: "High and critical alerts",
    sound: "high-critical_alert.wav",
  },
  info: {
    id: "alerts-info",
    developmentId: "alerts-info-dev",
    name: "Information alerts",
    sound: "info-alert.wav",
  },
  lowMedium: {
    id: "alerts-low-medium",
    developmentId: "alerts-low-medium-dev",
    name: "Low and medium alerts",
    sound: "low-medium-alert.wav",
  },
} as const;

type PermissionLike = {
  readonly granted?: boolean;
  readonly status?: "granted" | "denied" | "undetermined";
};

function isPermissionGranted(permission: PermissionLike): boolean {
  return permission.granted === true || permission.status === "granted";
}

function shouldUseBundledNotificationSounds(): boolean {
  return (
    !__DEV__ ||
    process.env.EXPO_PUBLIC_ENABLE_CUSTOM_NOTIFICATION_SOUNDS === "true"
  );
}

async function configureAndroidNotificationChannels(): Promise<void> {
  const useBundledSounds = shouldUseBundledNotificationSounds();
  const channelId = (
    channel: (typeof notificationSoundChannels)[keyof typeof notificationSoundChannels],
  ) => (useBundledSounds ? channel.id : channel.developmentId);
  const sound = (
    channel: (typeof notificationSoundChannels)[keyof typeof notificationSoundChannels],
  ) => (useBundledSounds ? channel.sound : undefined);

  // Android locks a channel's sound after creation. Dev fallback channel ids
  // prevent old dev-client builds from creating production channels without
  // the custom sound files bundled into the native app.
  await Promise.all([
    Notifications.setNotificationChannelAsync(
      channelId(notificationSoundChannels.highCritical),
      {
        importance: Notifications.AndroidImportance.MAX,
        lightColor: "#DC2626",
        name: notificationSoundChannels.highCritical.name,
        sound: sound(notificationSoundChannels.highCritical),
        vibrationPattern: [0, 250, 150, 250],
      },
    ),
    Notifications.setNotificationChannelAsync(
      channelId(notificationSoundChannels.info),
      {
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#208AEF",
        name: notificationSoundChannels.info.name,
        sound: sound(notificationSoundChannels.info),
      },
    ),
    Notifications.setNotificationChannelAsync(
      channelId(notificationSoundChannels.lowMedium),
      {
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#F59E0B",
        name: notificationSoundChannels.lowMedium.name,
        sound: sound(notificationSoundChannels.lowMedium),
      },
    ),
  ]);
}

export function configurePushNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getLastNotificationResponseAsync(): Promise<Notifications.NotificationResponse | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    return await Notifications.getLastNotificationResponse();
  } catch (error) {
    console.warn("Failed to get last notification response", error);
    return null;
  }
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    console.warn("Expo push token unavailable: use a physical device or dev build.");
    return null;
  }

  try {
    const existingPermission =
      (await Notifications.getPermissionsAsync()) as PermissionLike;
    let isGranted = isPermissionGranted(existingPermission);

    if (!isGranted) {
      const requestedPermission =
        (await Notifications.requestPermissionsAsync()) as PermissionLike;
      isGranted = isPermissionGranted(requestedPermission);
    }

    if (!isGranted) {
      console.warn("Expo push token unavailable: notification permission denied.");
      return null;
    }

    if (Platform.OS === "android") {
      await configureAndroidNotificationChannels();
    }

    if (!expoPushProjectId) {
      console.warn("Expo push token unavailable: missing EAS project id.");
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: expoPushProjectId,
    });

    return token.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      Platform.OS === "android" &&
      message.includes("Default FirebaseApp is not initialized")
    ) {
      console.warn(
        "Push` registration requires Android FCM setup (goog`le-services.json and a rebuilt app).",
      );
      return null;
    }

    console.warn("Failed to register for push notifications", error);
    return null;
  }
}
