import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { expoPushProjectId } from "@/constants";

const pushNotificationChannelId = "default";

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
    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        pushNotificationChannelId,
        {
          importance: Notifications.AndroidImportance.MAX,
          lightColor: "#208AEF",
          name: "default",
          vibrationPattern: [0, 250, 250, 250],
        },
      );
    }

    if (!expoPushProjectId) {
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
