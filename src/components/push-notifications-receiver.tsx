import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import {
    clearLastNotificationResponse,
    configurePushNotificationHandler,
    consumeLastNotificationResponseAsync,
    registerForPushNotificationsAsync,
    subscribeToNotificationResponses,
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
    const handleNotificationResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      if (!isMounted) return;
      clearLastNotificationResponse();
      onNotificationResponseReceived?.(response);
    };
    const unsubscribeNotificationResponses =
      subscribeToNotificationResponses(handleNotificationResponse);

    void registerForPushNotificationsAsync().then((token) => {
      if (isMounted && token) {
        onPushTokenReceived?.(token);
      }
    });

    void consumeLastNotificationResponseAsync().then((response) => {
      if (isMounted && response) {
        handleNotificationResponse(response);
      }
    });

    const notificationReceivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        onNotificationReceived?.(notification);
      });

    return () => {
      isMounted = false;
      notificationReceivedSubscription.remove();
      unsubscribeNotificationResponses();
    };
  }, [
    onNotificationReceived,
    onNotificationResponseReceived,
    onPushTokenReceived,
  ]);

  return null;
}
