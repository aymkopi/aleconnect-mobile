import { useAuthSession } from "@/hooks/use-auth-session";
import {
  fetchNotifications,
  subscribeNotificationsChanged,
} from "@/services/notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useUnreadNotificationCount() {
  const { session } = useAuthSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!session) {
        setUnreadCount(0);
        return;
      }

      const load = () =>
        void fetchNotifications({ userId: session.user.id })
        .then((response) => {
          if (isActive) setUnreadCount(response.unreadCount);
        })
        .catch(() => {
          if (isActive) setUnreadCount(0);
        });
      load();
      const unsubscribe = subscribeNotificationsChanged(load);

      return () => {
        isActive = false;
        unsubscribe();
      };
    }, [session]),
  );

  return unreadCount;
}
