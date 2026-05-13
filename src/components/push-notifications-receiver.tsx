import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import {
    configurePushNotificationHandler,
    getLastNotificationResponseAsync,
    registerForPushNotificationsAsync,
} from "@/services/push-notifications";

type PushNotificationsReceiverProps = {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponseReceived?: (
    response: Notifications.NotificationResponse,
  ) => void;
  onPushTokenReceived?: (token: string) => void;
};

export function PushNotificationsReceiver({
  onNotificationReceived,
  onNotificationResponseReceived,
  onPushTokenReceived,
}: PushNotificationsReceiverProps) {
  useEffect(() => {
    configurePushNotificationHandler();

    let isMounted = true;

    void registerForPushNotificationsAsync().then((token) => {
      if (isMounted && token) {
        onPushTokenReceived?.(token);
      }
    });

    void getLastNotificationResponseAsync().then((response) => {
      if (isMounted && response) {
        onNotificationResponseReceived?.(response);
      }
    });

    const notificationReceivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        onNotificationReceived?.(notification);
      });

    const notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        onNotificationResponseReceived?.(response);
      });

    return () => {
      isMounted = false;
      notificationReceivedSubscription.remove();
      notificationResponseSubscription.remove();
    };
  }, [
    onNotificationReceived,
    onNotificationResponseReceived,
    onPushTokenReceived,
  ]);

  return null;
}
