import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchNotifications } from "@/services/notifications";
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

      void fetchNotifications()
        .then((response) => {
          if (isActive) setUnreadCount(response.unreadCount);
        })
        .catch(() => {
          if (isActive) setUnreadCount(0);
        });

      return () => {
        isActive = false;
      };
    }, [session]),
  );

  return unreadCount;
}
